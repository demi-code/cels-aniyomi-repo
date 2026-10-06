function readBody(url) {
  if (typeof XMLHttpRequest === "function") {
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.send(null);
    if (xhr.status < 200 || xhr.status >= 300) {
      throw new Error("MangaDex HTTP " + xhr.status);
    }
    return xhr.responseText;
  }
  var response = fetch(url, { headers: { Accept: "application/json" } });
  var text = response.text();
  if (response.ok === false) {
    throw new Error("MangaDex HTTP " + response.status);
  }
  return text;
}

function titleOf(manga) {
  var titles = manga.attributes && manga.attributes.title ? manga.attributes.title : {};
  if (titles.en) return titles.en;
  for (var key in titles) {
    if (titles[key]) return titles[key];
  }
  return "MangaDex";
}

function entriesFrom(body) {
  var data = JSON.parse(body).data || [];
  return data.map(function (manga) {
    return {
      title: titleOf(manga),
      url: "/manga/" + manga.id,
      kind: "manga"
    };
  });
}

var source = {
  id: "cels-mangadex",
  name: "MangaDex",
  getPopular: function (page) {
    var offset = 20 * ((page || 1) - 1);
    var url = "https://api.mangadex.org/manga?limit=20&offset=" + offset +
      "&includes[]=cover_art&availableTranslatedLanguage[]=en&contentRating[]=safe&order[followedCount]=desc";
    return { entries: entriesFrom(readBody(url)) };
  },
  getLatestUpdates: function (page) {
    var offset = 20 * ((page || 1) - 1);
    var url = "https://api.mangadex.org/manga?limit=20&offset=" + offset +
      "&includes[]=cover_art&availableTranslatedLanguage[]=en&contentRating[]=safe&order[latestUploadedChapter]=desc";
    return { entries: entriesFrom(readBody(url)) };
  },
  search: function (query, page) {
    var offset = 20 * ((page || 1) - 1);
    var url = "https://api.mangadex.org/manga?limit=20&offset=" + offset +
      "&includes[]=cover_art&title=" + encodeURIComponent(query || "") +
      "&availableTranslatedLanguage[]=en&contentRating[]=safe";
    return { entries: entriesFrom(readBody(url)) };
  },
  getDetail: function (url) {
    var id = String(url).split("/").pop();
    var manga = JSON.parse(readBody(
      "https://api.mangadex.org/manga/" + id + "?includes[]=cover_art"
    )).data;
    var feed = JSON.parse(readBody(
      "https://api.mangadex.org/manga/" + id +
      "/feed?limit=100&translatedLanguage[]=en&order[chapter]=desc&includeEmptyPages=0"
    ));
    var chapters = (feed.data || []).map(function (chapter) {
      var number = chapter.attributes && chapter.attributes.chapter;
      var title = chapter.attributes && chapter.attributes.title;
      var name = number ? ("Ch. " + number) : "Chapter";
      if (title) name += " " + title;
      return { name: name, url: chapter.id };
    });
    var description = "";
    var descriptions = manga.attributes && manga.attributes.description;
    if (descriptions) description = descriptions.en || "";
    return {
      title: titleOf(manga),
      url: url,
      kind: "manga",
      description: description,
      chapters: chapters
    };
  },
  getPageList: function (url) {
    var payload = JSON.parse(readBody("https://api.mangadex.org/at-home/server/" + url));
    var chapter = payload.chapter || {};
    var files = chapter.data || [];
    return files.map(function (file) {
      return payload.baseUrl + "/data/" + chapter.hash + "/" + file;
    });
  },
  getVideoList: function () {
    return [];
  }
};
