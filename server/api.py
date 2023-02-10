from flask import Flask, jsonify
from flask_cors import CORS, cross_origin
from flask_socketio import SocketIO, emit
import parallel
import model
from grammar import fix_text
import time

app = Flask(__name__)
CORS(app, support_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*")


@app.route("/api")
def api():
    start = time.time()
    data = parallel.fetch()
    print(time.time() - start)
    return jsonify(data)


@app.route("/api/load_more")
def load_more_api():
    data = parallel.fetch()
    return jsonify(data)


@socketio.on("summarize_content")
def handle_summarize_content(data):
    summarized_content = model.summarizer(
        data["content"], min_length=200, max_length=256, do_sample=False
    )[0]["summary_text"]
    summarized_content = summarized_content[0].upper() + summarized_content[1:]
    summarized_content = fix_text(summarized_content)
    emit(
        "content_updated",
        {"content": summarized_content, "id": data["id"]},
        broadcast=True,
    )
    return "ok"


@socketio.on("query_search")
def handle_query_search(data):
    query = data
    results = parallel.query_search(query)
    emit("query_results", {"results": results}, broadcast=True)
    return "ok"


if __name__ == "__main__":
    socketio.run(app)
