const express = require("express");
const axios = require("axios");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const request = require("request");

const app = express();

app.get("/pindl", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).send({ error: "URL query parameter is required." });
  }

  if (!url.startsWith("https://pin.it") && !url.startsWith("https://in.pinterest.com") && !url.startsWith("https://www.pinterest.com")) {
    return res.status(400).send({ error: "URL not valid. It must start with pin.it or in.pinterest." });
  }

  try {
    let expandedUrl = url;

    const { hostname, pathname } = new URL(expandedUrl);
    const formattedPath = pathname.replace("/sent/", '');
    const fullUrl = "https://" + hostname + formattedPath;

    request.head(fullUrl, async (err, response) => {
      if (err) {
        console.error(err);
        return res.status(400).send({ error: "Invalid URL." });
      }

      if (response.statusCode >= 300 && response.statusCode < 400) {
        expandedUrl = response.headers.location;
      }

      try {
        const axiosResponse = await axios.get(expandedUrl);
        if (axiosResponse.status !== 200) {
          return res.status(500).send({ error: "HTTP error " + axiosResponse.status });
        }

        const data = axiosResponse.data;
        let mediaUrl;
        let mediaType = "video";

        try {
          const videoElement = new JSDOM(data).window.document.getElementsByTagName("video")[0].src;
          mediaUrl = videoElement.replace("/hls/", "/720p/").replace(".m3u8", ".mp4");
        } catch (error) {
          mediaUrl = new JSDOM(data).window.document.getElementsByTagName("img")[0].src;
          mediaType = "image";
        }

        if (mediaUrl) {
          return res.redirect(mediaUrl);
        } else {
          return res.status(500).send({ error: "Media URL not found." });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "An error occurred while processing the URL." + error });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "An error occurred." + error });
  }
});

const PORT = process.env.PORT || 19244;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
