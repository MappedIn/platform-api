Mappedin Website Integration Example
========

This example illustrates how to invoke Mappedin JSON API and use Leaflet to display a map. It also demonstrates map interactions through a dropdown that lists all locations by categories. The sample uses Twitter Bootstrap to simplify layout and styles.

## Getting Started

Before you can make HTTP calls to Mappedin API, you need to get an OAuth `client_id` and `client_secret`. You can either use these directly with HTTP Basic Authentication, or you can request an OAuth Bearer Token. If you elect to request an OAuth Bearer Token, you should do so on your back-end server.

For now, copy your OAuth `client_id` and `client_secret` into the appropriate variables in inline `<script>` element. You will also want to set the `venue` slug and `perspective` name.

```javascript
    var ACCESS_TOKEN = 'your OAuth Bearer token would go here';
    var CLIENT_ID = 'your client_id goes here';
    var CLIENT_SECRET = 'your client_secret goes here';
    var PERSPECTIVE = "your perspective name goes here";
    var VENUE = 'your venue slug goes here';
```

Start the demo by opening the `sample.html` file in your browser.

## API v1 Documentation
<!-- TODO: write docs that dont suck -->
[Get V1 documentation here](../../v1.md)
