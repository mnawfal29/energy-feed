import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Link,
  Grid,
  Box,
  Dialog,
  DialogActions,
  DialogTitle,
  DialogContent,
  DialogContentText,
  Button,
  AppBar,
  Toolbar,
  Switch,
  InputBase,
  FormGroup,
  FormControlLabel,
  CssBaseline,
  CircularProgress,
} from "@mui/material";
import {
  ThemeProvider,
  createTheme,
  styled,
  alpha,
} from "@mui/material/styles";

import io from "socket.io-client";

import SummarizeIcon from "@mui/icons-material/Summarize";
import SearchIcon from "@mui/icons-material/Search";
import AutorenewIcon from "@mui/icons-material/Autorenew";

import Fuse from "fuse.js";

const MaterialUISwitch = styled(Switch)(({ theme }) => ({
  width: 62,
  height: 34,
  padding: 7,

  "& .MuiSwitch-switchBase": {
    margin: 1,
    padding: 0,
    transform: "translateX(6px)",
    "&.Mui-checked": {
      color: "#fff",
      transform: "translateX(22px)",
      "& .MuiSwitch-thumb:before": {
        backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
          "#fff"
        )}" d="M4.2 2.5l-.7 1.8-1.8.7 1.8.7.7 1.8.6-1.8L6.7 5l-1.9-.7-.6-1.8zm15 8.3a6.7 6.7 0 11-6.6-6.6 5.8 5.8 0 006.6 6.6z"/></svg>')`,
      },
      "& + .MuiSwitch-track": {
        opacity: 1,
        backgroundColor: theme.palette.mode === "dark" ? "#8796A5" : "#aab4be",
      },
    },
  },
  "& .MuiSwitch-thumb": {
    backgroundColor: theme.palette.mode === "dark" ? "#003892" : "#001e3c",
    width: 32,
    height: 32,
    "&:before": {
      content: "''",
      position: "absolute",
      width: "100%",
      height: "100%",
      left: 0,
      top: 0,
      backgroundRepeat: "no-repeat",
      backgroundPosition: "center",
      backgroundImage: `url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 20 20"><path fill="${encodeURIComponent(
        "#fff"
      )}" d="M9.305 1.667V3.75h1.389V1.667h-1.39zm-4.707 1.95l-.982.982L5.09 6.072l.982-.982-1.473-1.473zm10.802 0L13.927 5.09l.982.982 1.473-1.473-.982-.982zM10 5.139a4.872 4.872 0 00-4.862 4.86A4.872 4.872 0 0010 14.862 4.872 4.872 0 0014.86 10 4.872 4.872 0 0010 5.139zm0 1.389A3.462 3.462 0 0113.471 10a3.462 3.462 0 01-3.473 3.472A3.462 3.462 0 016.527 10 3.462 3.462 0 0110 6.528zM1.665 9.305v1.39h2.083v-1.39H1.666zm14.583 0v1.39h2.084v-1.39h-2.084zM5.09 13.928L3.616 15.4l.982.982 1.473-1.473-.982-.982zm9.82 0l-.982.982 1.473 1.473.982-.982-1.473-1.473zM9.305 16.25v2.083h1.389V16.25h-1.39z"/></svg>')`,
    },
  },
  "& .MuiSwitch-track": {
    opacity: 1,
    backgroundColor: theme.palette.mode === "dark" ? "#8796A5" : "#aab4be",
    borderRadius: 20 / 2,
  },
}));

const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(1),
    width: "auto",
  },
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      width: "40ch",
      "&:focus": {
        width: "60ch",
      },
    },
  },
}));

const socket = io("http://localhost:5000");

function TwitterFeed() {
  const [tweets, setTweets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cardLoading, setCardLoading] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState(null);
  const [modalTitle, setModalTitle] = useState(null);
  const [modalImage, setModalImage] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [modalDate, setModalDate] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSource, setModalSource] = useState(null);
  const [modalUrl, setModalUrl] = useState(null);

  const [loadingMore, setLoadingMore] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [pageTheme, setPageTheme] = useState("light");
  const [isChecked, setIsChecked] = useState(false);

  const [summary, setSummary] = useState({});
  const [isSummarized, setIsSummarized] = useState({});
  const [originalContent, setOriginalContent] = useState({});

  const options = {
    shouldSort: true,
    threshold: 0.5,
    location: 0,
    distance: 100,
    minMatchCharLength: 1,
    keys: ["content", "title"],
  };

  const fuse = new Fuse(tweets, options);

  var theme = createTheme({
    palette: {
      mode: pageTheme,
    },
  });

  function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { year: "numeric", month: "long", day: "numeric" };
    return date.toLocaleDateString("en-US", options);
  }

  const summarizeContent = (id, content) => {
    setOriginalContent({ ...originalContent, [id]: content });
    socket.emit("summarize_content", { id, content });
    setIsSummarized({ ...isSummarized, [id]: true });
    setCardLoading(id);
    setModalLoading(true);
  };

  const handleShowOriginal = (id) => {
    setIsSummarized({ ...isSummarized, [id]: false });
    setModalContent(originalContent[id]);
    const updatedTweets = tweets.map((tweet) => {
      if (tweet.id === id) {
        return { ...tweet, content: originalContent[id] };
      }
      return tweet;
    });
    setTweets(updatedTweets);
  };

  const handleShowSummary = (id) => {
    setIsSummarized({ ...isSummarized, [id]: true });
    setModalContent(summary[id]);
    const updatedTweets = tweets.map((tweet) => {
      if (tweet.id === id) {
        return { ...tweet, content: summary[id] };
      }
      return tweet;
    });
    setTweets(updatedTweets);
  };

  useEffect(() => {
    socket.on("content_updated", (data) => {
      setCardLoading(null);
      setModalLoading(false);
      const updatedTweets = tweets.map((tweet) => {
        if (tweet.id === data.id) {
          return { ...tweet, content: data.content };
        }
        return tweet;
      });
      setSummary({ ...summary, [data.id]: data.content });
      setTweets(updatedTweets);
      setModalContent(data.content);
    });
  }, [tweets, summary]);

  const querySearch = (query) => {
    socket.emit("query_search", query);
    setQueryLoading(true);
  };

  useEffect(() => {
    socket.on("query_results", (data) => {
      setQueryLoading(false);
      console.log(data);
      setTweets([...tweets, ...data.results]);
    });
  }, [tweets]);

  useEffect(() => {
    async function fetchData() {
      const response = await fetch("http://localhost:5000/api");
      const data = await response.json();
      setTweets(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setLoading(false);
    }
    fetchData();
  }, []);

  const loadMore = () => {
    setLoadingMore(true);
    async function fetchData() {
      const response = await fetch("http://localhost:5000/api/load_more");
      const data = await response.json();
      setTweets([
        ...tweets,
        ...data.sort((a, b) => new Date(b.date) - new Date(a.date)),
      ]);
      setLoadingMore(false);
    }
    fetchData();
  };

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box display="flex" justifyContent="center" alignItems="center" mt={45}>
          <CircularProgress size="5rem" />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box sx={{ flexGrow: 1 }}>
          <AppBar position="fixed">
            <Toolbar>
              <Typography
                variant="h6"
                noWrap
                component="div"
                sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }}>
                Energy Feed
              </Typography>
              <Search>
                <SearchIconWrapper>
                  <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search…"
                  inputProps={{ "aria-label": "search" }}
                  onChange={(e) => setSearchValue(e.target.value)}
                />
              </Search>
              <FormGroup>
                <FormControlLabel
                  control={
                    <MaterialUISwitch
                      sx={{ m: 1, ml: 5 }}
                      defaultChecked={isChecked}
                      onClick={() => {
                        setIsChecked(!isChecked);
                        pageTheme === "light"
                          ? setPageTheme("dark")
                          : setPageTheme("light");
                      }}
                    />
                  }
                />
              </FormGroup>
            </Toolbar>
          </AppBar>
        </Box>
      </ThemeProvider>

      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Grid container spacing={5} p={5} mt={3}>
          {tweets
            .filter(
              (tweet) =>
                fuse
                  .search(searchValue)
                  .map((tweet) => tweet.item.id)
                  .includes(tweet.id) || searchValue === ""
            )
            .map((tweet, index) => (
              <Grid item xs={12} sm={6} md={4} key={tweet.id}>
                <Card elevation={7}>
                  <CardContent>
                    <Box>
                      <Typography variant="h5">{tweet.title}</Typography>
                      <Box display="flex" justifyContent="center" my={1}>
                        <img
                          src={tweet.image}
                          alt={tweet.title}
                          height="350px"
                          width="700px"
                        />
                      </Box>
                      <Box display="flex" justifyContent="flex-end" my={1}>
                        {isSummarized[tweet.id] ? (
                          <Button
                            variant="contained"
                            endIcon={<SummarizeIcon />}
                            onClick={() => handleShowOriginal(tweet.id)}
                            style={{
                              marginLeft: "100px",
                              display:
                                cardLoading === tweet.id ? "none" : "flex",
                            }}
                            color="success">
                            Show Original
                          </Button>
                        ) : (
                          <Button
                            variant="contained"
                            endIcon={<SummarizeIcon />}
                            onClick={() => {
                              if (summary[tweet.id]) {
                                handleShowSummary(tweet.id);
                              } else {
                                summarizeContent(tweet.id, tweet.content);
                              }
                            }}
                            style={{
                              marginLeft: "100px",
                              display:
                                cardLoading === tweet.id ? "none" : "flex",
                            }}>
                            Summarize
                          </Button>
                        )}
                      </Box>
                    </Box>
                    <Typography variant="body2" color="textSecondary" my={1}>
                      {formatDate(tweet.date)}
                    </Typography>
                    {cardLoading === tweet.id ? (
                      <Box
                        width={"100%"}
                        my={10}
                        display={"flex"}
                        justifyContent={"center"}
                        alignItems={"center"}>
                        <CircularProgress size="3.5rem" />
                      </Box>
                    ) : (
                      <Typography variant="body1">
                        {tweet.content.length >= 450 &&
                          tweet.content.substring(0, 450) + "..."}
                        {tweet.content.length < 450 && tweet.content}
                        <Button
                          onClick={() => {
                            setModalOpen(true);
                            setModalContent(tweet.content);
                            setModalTitle(tweet.title);
                            setModalImage(tweet.image);
                            setModalDate(tweet.date);
                            setModalId(tweet.id);
                            setModalSource(tweet.source);
                            setModalUrl(tweet.url);
                          }}
                          style={{ height: "17px" }}>
                          View More
                        </Button>
                      </Typography>
                    )}
                    <div style={{ marginTop: "10px" }}>
                      Source:{" "}
                      <Link href={tweet.url} target="_blank">
                        {tweet.source}
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </Grid>
            ))}

          {searchValue !== "" ? (
            tweets.filter(
              (tweet) =>
                fuse
                  .search(searchValue)
                  .map((tweet) => tweet.item.id)
                  .includes(tweet.id) || searchValue === ""
            ).length > 0 ? (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                flexDirection="column"
                my={10}
                width="100%">
                {!queryLoading && (
                  <Box
                    display="flex"
                    justifyContent="center"
                    alignItems="center"
                    flexDirection="column">
                    <Typography variant="h4" color="textSecondary" gutterBottom>
                      End of Search Results
                    </Typography>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Click on the button to query more from Google News
                    </Typography>
                    <Typography>
                      <Button
                        onClick={() => querySearch(searchValue)}
                        variant="contained"
                        sx={{ mt: 2, mb: 2 }}
                        endIcon={<SearchIcon style={{ fontSize: 30 }} />}>
                        <Typography variant="h6" p={1}>
                          Search Query
                        </Typography>
                      </Button>
                    </Typography>
                  </Box>
                )}
                {queryLoading && (
                  <Box
                    width={"100%"}
                    my={8}
                    display={"flex"}
                    justifyContent={"center"}
                    alignItems={"center"}>
                    <CircularProgress size="6rem" />
                  </Box>
                )}
              </Box>
            ) : (
              <Box
                display="flex"
                justifyContent="center"
                alignItems="center"
                flexDirection="column"
                my={30}
                width="100%">
                {!queryLoading && (
                  <>
                    <Typography variant="h4" color="textSecondary" gutterBottom>
                      No Feeds Found
                    </Typography>
                    <Typography variant="h6" color="textSecondary" gutterBottom>
                      Click on the button to query Google News
                    </Typography>
                    <Typography>
                      <Button
                        onClick={() => querySearch(searchValue)}
                        variant="contained"
                        sx={{ mt: 2, mb: 2 }}
                        endIcon={<SearchIcon style={{ fontSize: 30 }} />}>
                        <Typography variant="h6" p={1}>
                          Search Query
                        </Typography>
                      </Button>
                    </Typography>
                  </>
                )}
                {queryLoading && (
                  <Box
                    width={"100%"}
                    my={8}
                    display={"flex"}
                    justifyContent={"center"}
                    alignItems={"center"}>
                    <CircularProgress size="6rem" />
                  </Box>
                )}
              </Box>
            )
          ) : (
            <>
              {!loadingMore && (
                <Box
                  display="flex"
                  justifyContent="center"
                  alignItems="center"
                  flexDirection="column"
                  my={10}
                  width="100%">
                  <Button
                    onClick={() => loadMore()}
                    variant="contained"
                    sx={{ mt: 2, mb: 2 }}
                    endIcon={<AutorenewIcon style={{ fontSize: "40px" }} />}>
                    <Typography variant="h6" p={1}>
                      Load More
                    </Typography>
                  </Button>
                </Box>
              )}
              {loadingMore && (
                <Box
                  width={"100%"}
                  my={10}
                  display={"flex"}
                  justifyContent={"center"}
                  alignItems={"center"}>
                  <CircularProgress size="5rem" />
                </Box>
              )}
            </>
          )}
          <Dialog
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            maxWidth="md">
            <DialogTitle>{modalTitle}</DialogTitle>

              <Typography variant="body2" color="textSecondary">
                <DialogContent sx={{ pt: 0, pb: 1 }}>
                {formatDate(modalDate)}
                </DialogContent>
              </Typography>

            <Box display="flex" justifyContent="center" my={1}>
              <img
                src={modalImage}
                alt={"modalImage"}
                style={{ maxHeight: "300px" }}
              />
            </Box>
            <Box display="flex" justifyContent="center" my={1}>
              {isSummarized[modalId] ? (
                <Button
                  variant="contained"
                  endIcon={<SummarizeIcon />}
                  onClick={() => handleShowOriginal(modalId, modalContent)}
                  style={{
                    display: cardLoading === modalId ? "none" : "flex",
                  }}
                  color="success">
                  Show Original
                </Button>
              ) : (
                <Button
                  variant="contained"
                  endIcon={<SummarizeIcon />}
                  onClick={() => {
                    if (summary[modalId]) {
                      handleShowSummary(modalId);
                    } else {
                      summarizeContent(modalId, modalContent);
                    }
                  }}
                  style={{
                    display: cardLoading === modalId ? "none" : "flex",
                  }}>
                  Summarize
                </Button>
              )}
            </Box>

            <DialogContent>
              <DialogContentText>
                {modalLoading ? (
                  <Box
                    width={"100%"}
                    py={6}
                    display={"flex"}
                    justifyContent={"center"}
                    alignItems={"center"}
                    sx={{ px: { md: 45 } }}>
                    <CircularProgress size="5rem" />
                  </Box>
                ) : (
                  <Typography variant="body1">{modalContent}</Typography>
                )}
              </DialogContentText>
            </DialogContent>
            <DialogActions
              sx={{ display: "flex", justifyContent: "space-between" }}>
              <Box>
                Source :{" "}
                <Link href={modalUrl} target="_blank">
                  {modalSource}{" "}
                </Link>
              </Box>
              <Button onClick={() => setModalOpen(false)} color="primary">
                Close
              </Button>
            </DialogActions>
          </Dialog>
        </Grid>
      </ThemeProvider>
    </>
  );
}

export default TwitterFeed;