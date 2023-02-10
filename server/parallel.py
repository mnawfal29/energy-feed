from flask import Flask, jsonify
import requests
from bs4 import BeautifulSoup
import lxml
from datetime import datetime
import urllib.parse
import gc
import uuid
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor, as_completed
from requests_futures.sessions import FuturesSession
from newspaper import Article
import torch

gc.collect()
torch.cuda.empty_cache()

current_query = None
current_page = [0, 1, 1, 1, 1]
link_q = [[] for _ in range(5)]
gpu_q = []
default_google_q = []
current_google_q = []

month_dict = {
    "January": "01",
    "February": "02",
    "March": "03",
    "April": "04",
    "May": "05",
    "June": "06",
    "July": "07",
    "August": "08",
    "September": "09",
    "October": "10",
    "November": "11",
    "December": "12",
}

short_month_dict = {
    "Jan": "01",
    "Feb": "02",
    "Mar": "03",
    "Apr": "04",
    "May": "05",
    "Jun": "06",
    "Jul": "07",
    "Aug": "08",
    "Sep": "09",
    "Oct": "10",
    "Nov": "11",
    "Dec": "12",
}


def scrape_mit():
    k = current_page[0]
    URL_mit = (
        "https://climate.mit.edu/news?sort_bef_combine=created_DESC&sort_by=created&sort_order=DESC&page="
        + str(k)
    )
    page_mit = requests.get(URL_mit)
    soup_mit = BeautifulSoup(page_mit.content, "html.parser")
    results_mit = soup_mit.find_all(class_="field-group-link card-link")

    for i in results_mit:
        try:
            if i.find(class_="pseudo-author").get_text() == "MIT News":
                link = i["href"]
                link_q[0].append("https://climate.mit.edu" + link)
        except:
            continue


def scrape_iea():
    i = current_page[1]
    URL_iea = "https://www.iea.org/news?page=" + str(i)
    page_iea = requests.get(URL_iea)

    soup_iea = BeautifulSoup(page_iea.content, "html.parser")
    results_iea = soup_iea.find_all("article")

    for i in results_iea:
        link = i.find("a")["href"]
        link_q[1].append("https://www.iea.org/" + link)


def scrape_rn():
    i = current_page[2]
    URL_rn = "https://www.rechargenews.com/latest?page=" + str(i)
    page_rn = requests.get(URL_rn)
    soup_rn = BeautifulSoup(page_rn.content, "html.parser")
    results_rn = soup_rn.find_all(class_="teaser-body-image")

    for i in results_rn:
        link = i.find("a")["href"]
        link_q[2].append("https://www.rechargenews.com" + link)


def scrape_en():
    i = current_page[3]
    URL_en = "https://www.euronews.com/tag/energy?p=" + str(i)
    page_en = requests.get(URL_en)
    soup_en = BeautifulSoup(page_en.content, "html.parser")
    results_en = soup_en.find_all(class_="m-object__title qa-article-title")

    for i in results_en:
        link = i.find("a")["href"]
        link_q[3].append("https://www.euronews.com" + link)


def scrape_mi():
    i = current_page[4]
    URL_mi = "https://mercomindia.com/archive/page-" + str(i)
    page_mi = requests.get(URL_mi)
    soup_mi = BeautifulSoup(page_mi.content, "html.parser")
    results_mi = soup_mi.find_all(class_="pt-cv-title")

    for i in results_mi:
        link = i.find("a")["href"]
        link_q[4].append(link)


def scrape_google(query=None):
    global default_google_q, current_google_q
    try:
        if query == None:
            query = urllib.parse.quote("carbon energy")
            google_news = requests.get(
                f"https://news.google.com/rss/search?q={query}%20when%3A2d&hl=en-US&gl=US&ceid=US%3Aen"
            )
            byte_data = google_news.content
            root = lxml.etree.fromstring(byte_data)
            default_google_q = root.findall(".//item")
        else:
            query = urllib.parse.quote(query)
            google_news = requests.get(
                f"https://news.google.com/rss/search?q={query}%20when%3A2d&hl=en-US&gl=US&ceid=US%3Aen"
            )
            byte_data = google_news.content
            root = lxml.etree.fromstring(byte_data)
            current_google_q = root.findall(".//item")
    except Exception as e:
        print(e)
        pass


def fetch_google(n_articles=3, query=None):
    global current_google_q, default_google_q, current_query

    def convert_date(date):
        date = date.split(" ")
        day = date[1]
        month = date[2]
        year = date[3]
        month = short_month_dict[month]
        return year + "-" + month + "-" + day

    def download_article(url):
        try:
            article = Article(url)
            article.download()
            article.parse()
            return article
        except:
            pass

    try:
        if query == None:
            if not default_google_q:
                scrape_google(query)
            use_q = default_google_q
        elif query == current_query:
            if not current_google_q:
                scrape_google(query)
            use_q = current_google_q
        else:
            current_google_q = []
            current_query = query
            scrape_google(query)
            use_q = current_google_q
        if len(use_q) < n_articles:
            return []

        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = [
                executor.submit(download_article, item.find("link").text)
                for item in use_q[:n_articles]
            ]

        results = []

        for future in as_completed(futures):
            try:
                index = futures.index(future)
                article = future.result()
                title = article.title
                date = convert_date(use_q[index].find("pubDate").text)
                text = article.text
                source = use_q[index].find("source").text
                image = article.top_image
                url = article.url
                if text == None:
                    continue
                results.append(
                    {
                        "title": title,
                        "date": date,
                        "content": text,
                        "source": source + " via (Google News)",
                        "image": image,
                        "id": str(uuid.uuid1()),
                        "url": url,
                    }
                )
            except:
                continue
        if query == None:
            default_google_q = default_google_q[n_articles:]
        else:
            current_google_q = current_google_q[n_articles:]

        print("Google done")
        return results

    except Exception as e:
        print(e)
        return []


def fetch_mit(n_articles=3):
    def convert_date(date):
        date = date.split(" ")
        day = date[1].replace(",", "")
        month = date[0]
        year = date[2]
        month = month_dict[month]
        return year + "-" + month + "-" + day

    try:
        while len(link_q[0]) < n_articles:
            scrape_mit()
            current_page[0] += 1

        session = FuturesSession(executor=ThreadPoolExecutor())

        futures = [session.get(url) for url in link_q[0][:n_articles]]
        link_q[0] = link_q[0][n_articles:]

        results = []

        for future in as_completed(futures):
            try:
                response = future.result()
                article_soup = BeautifulSoup(response.content, "html.parser")
                for script in article_soup(["script", "style"]):
                    script.decompose()
                title = article_soup.find(class_="faux-full-title").get_text()
                date = (
                    article_soup.find(class_="type-date")
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                date = convert_date(date)
                content = (
                    article_soup.find(
                        class_="clearfix text-formatted field field--name-body field--type-text-with-summary field--label-hidden field__item"
                    )
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                image = (
                    "https://climate.mit.edu"
                    + article_soup.find(class_="image-style-post-image")["src"]
                )
                results.append(
                    {
                        "title": title,
                        "content": content,
                        "date": date,
                        "source": "MIT",
                        "url": response.url,
                        "id": str(uuid.uuid1()),
                        "image": image,
                    }
                )
            except:
                pass

        print("MIT done")
        return results

    except Exception as e:
        print(e)
        return []


def fetch_iea(n_articles=3):
    def convert_date(date):
        date = date.split(" ")
        day = date[0]
        month = date[1]
        year = date[2]
        month = month_dict[month]
        return year + "-" + month + "-" + day

    try:
        while len(link_q[1]) < n_articles:
            scrape_iea()
            current_page[1] += 1

        session = FuturesSession(executor=ThreadPoolExecutor())

        futures = [session.get(url) for url in link_q[1][:n_articles]]
        link_q[1] = link_q[1][n_articles:]

        results = []

        for future in as_completed(futures):
            try:
                response = future.result()
                article_soup = BeautifulSoup(response.content, "html.parser")
                for script in article_soup(["script", "style"]):
                    script.decompose()
                title = article_soup.find(
                    class_="o-hero-freepage__title f-title-3"
                ).get_text()
                date = (
                    article_soup.find(class_="o-hero-freepage__meta")
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                date = convert_date(date)
                content = (
                    article_soup.find(class_="m-block m-block--text")
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                image = article_soup.find(class_="o-page__img").find("img")["data-src"]
                results.append(
                    {
                        "title": title,
                        "content": content,
                        "date": date,
                        "source": "iea",
                        "url": response.url,
                        "id": str(uuid.uuid1()),
                        "image": image,
                    }
                )
            except:
                pass

        print("IEA done")
        return results

    except Exception as e:
        print(e)
        return []


def fetch_rn(n_articles=3):
    def convert_date(date):
        date = date.split(" ")
        day = date[3]
        month = date[4]
        year = date[5]
        month = month_dict[month]
        return year + "-" + month + "-" + day

    try:
        while len(link_q[2]) < n_articles:
            scrape_rn()
            current_page[2] += 1

        session = FuturesSession(executor=ThreadPoolExecutor())

        futures = [session.get(url) for url in link_q[2][:n_articles]]
        link_q[2] = link_q[2][n_articles:]

        results = []

        for future in as_completed(futures):
            try:
                response = future.result()
                article_soup = BeautifulSoup(response.content, "html.parser")
                for script in article_soup(["script", "style"]):
                    script.decompose()
                title = (
                    article_soup.find(
                        class_="fs-xxl fw-bold mb-4 article-title ff-sueca-bold"
                    )
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                date = (
                    article_soup.find(class_="pr-3")
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                date = convert_date(date)
                content = (
                    article_soup.find(class_="article-body")
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                image = article_soup.find("figure").find("img")["src"]
                results.append(
                    {
                        "title": title,
                        "content": content,
                        "date": date,
                        "source": "RechargeNow",
                        "url": response.url,
                        "id": str(uuid.uuid1()),
                        "image": image,
                    }
                )
            except:
                pass

        print("RN done")
        return results
    except Exception as e:
        print(e)
        return []


def fetch_en(n_articles=3):
    def convert_date(date):
        date = date.split(":")
        date[1] = date[1].split(" ")
        date[1] = date[1][0]
        day = date[1].split("/")[0]
        month = date[1].split("/")[1]
        year = date[1].split("/")[2]
        return year + "-" + month + "-" + day

    try:
        while len(link_q[3]) < n_articles:
            scrape_en()
            current_page[3] += 1

        session = FuturesSession(executor=ThreadPoolExecutor())

        futures = [session.get(url) for url in link_q[3][:n_articles]]
        link_q[3] = link_q[3][n_articles:]

        results = []

        for future in as_completed(futures):
            try:
                response = future.result()
                article_soup = BeautifulSoup(response.content, "html.parser")
                for script in article_soup(["script", "style"]):
                    script.decompose()
                title = (
                    article_soup.find(class_="c-article-title")
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                date = (
                    article_soup.find(class_="c-article-date")
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                date = convert_date(date)
                content = (
                    article_soup.find(class_="js-responsive-iframes-container")
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                image = article_soup.find(
                    class_="js-poster-img c-article-media__img u-max-height-full u-position-absolute u-width-full u-z-index-1"
                )["src"]
                results.append(
                    {
                        "title": title,
                        "content": content,
                        "date": date,
                        "source": "Euronews",
                        "url": response.url,
                        "id": str(uuid.uuid1()),
                        "image": image,
                    }
                )
            except:
                pass

        print("EN done")
        return results

    except Exception as e:
        print(e)
        return []


def fetch_mi(n_articles=3):
    def convert_date(date):
        date = date.split(" ")
        day = date[2].replace(",", "")
        month = date[1]
        year = date[3]
        month = short_month_dict[month]
        return year + "-" + month + "-" + day

    try:
        while len(link_q[4]) < n_articles:
            scrape_mi()
            current_page[4] += 1

        session = FuturesSession(executor=ThreadPoolExecutor())

        futures = [session.get(url) for url in link_q[4][:n_articles]]
        link_q[4] = link_q[4][n_articles:]

        results = []

        for future in as_completed(futures):
            try:
                response = future.result()
                article_soup = BeautifulSoup(response.content, "html.parser")
                for script in article_soup(["script", "style"]):
                    script.decompose()
                title = (
                    article_soup.find("div", {"id": "page-title-text"})
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                date = (
                    article_soup.find(class_="entry-date")
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                )
                date = convert_date(date)
                content = (
                    article_soup.find(class_="entry-content")
                    .get_text()
                    .replace("\n", " ")
                    .replace("\xa0", "")
                    .split("Listen to this article ")[1]
                )
                image = article_soup.find(
                    class_="attachment-full size-full wp-post-image"
                )["src"]
                results.append(
                    {
                        "title": title,
                        "content": content,
                        "date": date,
                        "source": "Mercom India",
                        "url": response.url,
                        "id": str(uuid.uuid1()),
                        "image": image,
                    }
                )
            except:
                pass

        print("MI done")
        return results

    except Exception as e:
        print(e)
        return []


def fetch_urls():
    futures = []
    with ThreadPoolExecutor() as executor:
        futures.append(executor.submit(fetch_mit, 2))
        futures.append(executor.submit(fetch_iea, 2))
        futures.append(executor.submit(fetch_en, 2))
        futures.append(executor.submit(fetch_rn, 2))
        futures.append(executor.submit(fetch_mi, 2))
        futures.append(executor.submit(fetch_google, 10))

    for future in as_completed(futures):
        gpu_q.extend(future.result())

    # gpu_q.sort(key=lambda x: datetime.strptime(x['date'], '%Y-%m-%d'), reverse=True)

    return gpu_q


def fetch():
    global gpu_q
    gpu_q = []
    data = fetch_urls()
    return data


def query_search(query):
    data = fetch_google(10, query)
    return data
