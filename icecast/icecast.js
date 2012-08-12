/*
 *  icecast directory
 *
 *  Copyright (C) 2012 Henrik Andersson
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */


(function(plugin) {
    var BASE_URL = "http://dir.xiph.org";
    var PREFIX = "icecast:";

    var genres = [
	"80s",
	"Alternative",
	"Ambient",
	"Breaks",
	"Chillout",
	"Dance",
	"Dubstep",
	"Drumnbass",
	"Electronic",
	"Funk",
	"Gothic",
	"Harcore",
	"Hardstyle",
	"Hardtrance",
	"Hip Hop",
	"House",
	"Jazz",
	"Jungle",
	"Lounge",
	"Metal",
	"Minimal",
	"Mixed",
	"Pop",
	"Progressive",
	"Punk",
	"Radio",
	"Rock",
	"Techno",
	"Top40",
	"Trance",
	"Tribal",
	"Various"
    ];


    plugin.createService("icecast", PREFIX + "start", "audio", true,
			 plugin.path + "icecast_square.png");

    function fixup_html(doc) {
	doc = doc.replace(/\&amp;/g,'&');
	doc = doc.replace(/\&gt;/g,'>');
	doc = doc.replace(/\&lt;/g,'<');
	doc = doc.replace(/\&#039;/g,'\'');
	return doc;
    }

    function getValue(doc, start, end) {
	var s = doc.indexOf(start);
	if (s < 0)
	    return null;

	s = s + start.length;

	if (end != null) {
	    var e = doc.indexOf(end,s);
	    if (e < 0)
		return null;

	    return doc.substr(s, e-s);
	} 

	return doc.substr(s);
    }

    function scrape_page(page, doc) {

	var itemmd = {};
	doc = fixup_html(doc);
	while(1) {
	    var str = "<tr class=\"row";
	    var s = doc.indexOf(str, 2);
	    if (s < 0)
		break;
	    doc = doc.substr(s);

	    // get title
	    str = getValue(doc, "<span class=\"name\">","</span>");
	    if (str == null) continue;
	    if (str.indexOf("<a href=") >= 0) {
		// name is a link
		str = getValue(str, ">","</a>");
		if (str == null) continue;
	    }
	    itemmd.title = str;

	    // description [optional]
	    str =  getValue(doc, "<p class=\"description\">","</p>");
	    if (str)
		itemmd.description = str;

	    // get listeners
	    str = getValue(doc, "<span class=\"listeners\">","</span>");
	    if (str == null) continue;
	    str = getValue(str, "[","&nbsp;listeners]");
	    if (str == null) continue;
	    itemmd.listeners = str;

	    // get current track playing
	    str = getValue(doc, "<p class=\"stream-onair\">","</p>");
	    if (str == null) continue;
	    str = getValue(str, "</strong>", null);
	    if (str == null) continue;
	    itemmd.current_track = str;
	    
	    // get playlist url
	    var str = "<a href=\"/listen/";
	    var s = doc.indexOf(str, 2);
	    if (s < 0)
		continue;
	    doc = doc.substr(s);
	    str = getValue(doc, "<a href=\"","\"");
	    if(str == null) continue;
	    itemmd.url = str;

	    // get format and bitrate
	    var str = "<p class=\"format\" title=\"";
	    var s = doc.indexOf(str, 2);
	    if (s < 0)
		continue;
	    doc = doc.substr(s);

	    str = getValue(doc, "title=\"", "\"");
	    if (str == null) continue;
	    itemmd.bitrate = str;

	    str = getValue(doc, "streams\">", "<span");
	    if (str == null) continue;
	    itemmd.format = str;

	    // create richtext as title
	    var tt = "";
	    tt += '<font color="00FF00">' + itemmd.title + '</font><br>';
	    if (itemmd.description)
		tt += '<font>' + itemmd.description + '</font><br>';

	    tt += '<hr style="border: none; border-top: 1 px solid black;"><font>Current playing: ' + itemmd.current_track +'</font><br>';

	    tt += '<font>';
	    tt += itemmd.listeners + ' listeners'  + '    |    ';
	    tt += itemmd.bitrate + ' (' + itemmd.format +')';
	    tt += '</font>';


	    // add item to showtime page
	    page.appendItem("shoutcast:" + BASE_URL + itemmd.url, "audio", {
		title: new showtime.RichText(tt),
		description: itemmd.description,
		bitrate: itemmd.bitrate,
		format: itemmd.format,
		listeners: itemmd.listeners,
		current_track: itemmd.current_track
	    }); 
	}
    }

    // Search
    plugin.addURI(PREFIX + "search", function(page) {
	page.loading = false;
	var search = showtime.textDialog('Search: ', true, false);
	if (search.rejected)
	    return;
	var query = search.input;
	page.type = "directory";
	page.contents = "items";
	page.metadata.title = "Search result: " + query;
	page.metadata.logo = plugin.path + "icecast_square.png";
	page.loading = true;
	var doc = showtime.httpGet(BASE_URL + "/search?search=" + query, {}).toString();
	scrape_page(page, doc);
	page.loading = false;
    });

    plugin.addURI(PREFIX + "search:(.*)", function(page, query) {
	page.type = "directory";
	page.contents = "items";
	page.metadata.title = "Search result: " + query;
	page.metadata.logo = plugin.path + "icecast_square.png";
	var doc = showtime.httpGet(BASE_URL + "/search?search=" + query, {}).toString();
	scrape_page(page, BASE_URL + "/search?search=" + doc);
	page.loading = false;
    });


    // Genre
    plugin.addURI(PREFIX + "genre:(.*)", function(page, genre) {
	page.type = "directory";
	page.contents = "items";
	page.metadata.logo = plugin.path + "di_square.png";
	page.metadata.title = "icecast directory - " + genre;
	var doc = showtime.httpGet(BASE_URL + "/by_genre/" + genre, {}).toString();
	scrape_page(page, doc);
	page.loading = false;
    });

    // Start page
    plugin.addURI(PREFIX + "start", function(page) {
	page.type = "directory";
	page.contents = "items";
	page.metadata.logo = plugin.path + "di_square.png";
	page.metadata.title = "icecast directory";

	page.appendItem(PREFIX + "search", "item", {
	    title: "Search"
	});

	for each (genre in genres) {
	    page.appendItem(PREFIX + "genre:"+genre, "item", {
		title: genre
	    });
	}

	page.loading = false;
    });
})(this);
