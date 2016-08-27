(function (exports) {
  var BASE_URL = 'https://api.mappedin.com/1/';

  //
  // utilities
  //

  function addToSet(array, value) {
    if (array.indexOf(value) < 0) {
      array.push(value);
    }
  }

  function assignMissing(target, source) {
    var keys = Object.keys(source);
    for (var i = 0, iLen = keys.length; i < iLen; ++i) {
      var key = keys[i];
      if (!(key in target)) {
        target[key] = source[key];
      }
    }
  }

  function defineGetter(proto, name, getter) {
    Object.defineProperty(proto.prototype, name, {
      configurable: false,
      enumerable: false,
      get: getter,
      set: undefined
    });
  }

  function defineRelation(proto, name, enumerator) {
    defineGetter(proto, name, function getter() {
      var cache = this._cache[name];
      if (cache === undefined) {
        cache = this._cache[name] = enumerator.call(this);
      }
      return cache;
    });
  }

  function filterUndefined(array) {
    var filtered = [];
    for (var i = 0, iLen = array.length; i < iLen; ++i) {
      var item = array[i];
      if (item !== undefined) {
        filtered.push(item);
      }
    }
    return filtered;
  }

  //
  // resources
  //

  function MappedinCategory(mappedin, data) {
    this._mappedin = mappedin;
    this._data = data;
    this._cache = {};
    assignMissing(this, data);
  }

  MappedinCategory._fetch = function (mappedin, cb) {
    var query = {
      fields: mappedin._things.categories,
      venue: mappedin._venue,
    };
    mappedin._getArray('category', query, function (err, data) {
      if (err) return cb(err);
      for (var i = 0, iLen = data.length; i < iLen; ++i) {
        data[i] = new MappedinCategory(mappedin, data[i]);
      }
      cb(null, data);
    });
  };

  defineRelation(MappedinCategory, 'locations', function () {
    var related = [];
    var locations = this._mappedin.locations;
    var id = this._data.id;
    for (var i = 0, iLen = locations.length; i < iLen; ++i) {
      var location = locations[i];
      var through = location._data.categories;
      if (through) {
        for (var j = 0, jLen = through.length; j < jLen; ++j) {
          if (through[j] === id) {
            related.push(location);
          }
        }
      }
    }
    return related;
  });

  function MappedinLocation(mappedin, data) {
    this._mappedin = mappedin;
    this._data = data;
    this._cache = {};
    assignMissing(this, data);
  }

  MappedinLocation._fetch = function (mappedin, cb) {
    var fields = mappedin._things.locations.slice();
    if (mappedin._things.categories) {
      addToSet(fields, 'categories');
    }
    if (mappedin._things.nodes) {
      addToSet(fields, 'nodes');
    }
    if (mappedin._things.polygons) {
      addToSet(fields, 'polygons');
    }
    var query = {
      fields: fields,
      venue: mappedin._venue,
    };
    mappedin._getArray('location', query, function (err, data) {
      if (err) return cb(err);
      for (var i = 0, iLen = data.length; i < iLen; ++i) {
        data[i] = new MappedinLocation(mappedin, data[i]);
      }
      cb(null, data);
    });
  };

  defineRelation(MappedinLocation, 'polygons', function () {
    var related = [];
    var through = this._data.polygons;
    var polygons = this._mappedin.polygons;
    if (through) {
      var i, iLen;
      var hash = {};
      for (i = 0, iLen = through.length; i < iLen; ++i) {
        hash[through[i].id] = true;
      }
      for (i = 0, iLen = polygons.length; i < iLen; ++i) {
        var polygon = polygons[i];
        if (hash[polygon.id] === true) {
          related.push(polygon);
          hash[polygon.id] = false;
        }
      }
    }
    return related;
  });

  function MappedinMap(mappedin, data) {
    this._mappedin = mappedin;
    this._data = data;
    this._cache = {};
    assignMissing(this, data);
  }

  MappedinMap._fetch = function (mappedin, cb) {
    var fields = mappedin._things.maps.slice();
    if (mappedin._perspective) {
      addToSet(fields, 'perspective');
    }
    var query = {
      fields: fields,
      perspective: mappedin._perspective || undefined,
      venue: mappedin._venue
    };
    mappedin._getArray('map', query, function (err, data) {
      if (err) return cb(err);
      for (var i = 0, iLen = data.length; i < iLen; ++i) {
        var map = data[i];
        if (mappedin._perspective) {
          var per = map.perspective;
          if (per != null) {
            for (var j = 0, jLen = fields.length; j < jLen; ++j) {
              var field = fields[j];
              switch (field) {
                case 'width':
                case 'height':
                  map[field] = per.size && per.size[field] || per[field];
                  break;
                case 'tiles':
                case 'original':
                  map[field] = per[field];
                  break;
              }
            }
          }
          delete map.perspective;
        }
        data[i] = new MappedinMap(mappedin, map);
      }
      cb(null, data);
    });
  };

  defineRelation(MappedinMap, 'polygons', function () {
    var related = [];
    var polygons = this._mappedin.polygons;
    var id = this._data.id;
    for (var i = 0, iLen = polygons.length; i < iLen; ++i) {
      var polygon = polygons[i];
      if (polygon.map === id) {
        related.push(polygon);
      }
    }
    return related;
  });

  function MappedinNode(mappedin, data) {
    this._mappedin = mappedin;
    this._data = data;
    this._cache = {};
    assignMissing(this, data);
  }

  MappedinNode._fetch = function (mappedin, cb) {
    var fields = mappedin._things.nodes.slice();
    if (mappedin._things.maps) {
      addToSet(fields, 'map');
    }
    var query = {
      fields: fields,
      perspective: mappedin._perspective || undefined,
      venue: mappedin._venue
    };
    mappedin._getArray('node', query, function (err, data) {
      if (err) return cb(err);
      for (var i = 0, iLen = data.length; i < iLen; ++i) {
        data[i] = new MappedinNode(mappedin, data[i]);
      }
      cb(null, data);
    });
  };

  function MappedinPolygon(mappedin, data) {
    this._mappedin = mappedin;
    this._data = data;
    this._cache = {};
    assignMissing(this, data);
  }

  MappedinPolygon._fetch = function (mappedin, cb) {
    var fields = mappedin._things.polygons.slice();
    if (mappedin._things.maps) {
      addToSet(fields, 'map');
    }
    if (mappedin._things.nodes) {
      addToSet(fields, 'entrances');
    }
    var query = {
      fields: fields,
      perspective: mappedin._perspective || undefined,
      venue: mappedin._venue
    };
    mappedin._getArray('polygon', query, function (err, data) {
      if (err) return cb(err);
      var isSparse = false;
      var hasVertexes = fields.indexOf('vertexes') >= 0;
      for (var i = 0, iLen = data.length; i < iLen; ++i) {
        var polygon = data[i];
        if (hasVertexes) {
          var vertexes = polygon.vertexes;
          if (!vertexes || vertexes.length <= 2) {
            polygon = undefined;
          } else {
            var isValid = true;
            for (var j = 0, jLen = vertexes.length; j < jLen; ++j) {
              var vertex = vertexes[j];
              if (typeof vertex.x !== 'number' || !isFinite(vertex.x) ||
                typeof vertex.y !== 'number' || !isFinite(vertex.y)) {
                isValid = false;
                break;
              }
            }
            if (!isValid) {
              polygon = undefined;
            }
          }
        }
        if (polygon === undefined) {
          isSparse = true;
          data[i] = undefined;
        } else {
          data[i] = new MappedinPolygon(mappedin, polygon);
        }
      }
      if (isSparse) {
        data = filterUndefined(data);
      }
      cb(null, data);
    });
  };

  defineRelation(MappedinPolygon, 'locations', function () {
    var related = [];
    var locations = this._mappedin.locations;
    var id = this._data.id;
    for (var i = 0, iLen = locations.length; i < iLen; ++i) {
      var location = locations[i];
      var through = location._data.polygons;
      if (through) {
        for (var j = 0, jLen = through.length; j < jLen; ++j) {
          var tuple = through[j];
          if (tuple.id === id) {
            related.push(location);
          }
        }
      }
    }
    return related;
  });

  var THINGS = {
    categories: MappedinCategory,
    locations: MappedinLocation,
    maps: MappedinMap,
    nodes: MappedinNode,
    polygons: MappedinPolygon
  };

  function Mappedin(options) {
    this._accessToken = options.accessToken || null;
    this._baseUrl = options.baseUrl || BASE_URL;
    this._clientId = options.clientId || null;
    this._clientSecret = options.clientSecret || null;
    this._perspective = options.perspective || null;
    this._things = options.things || {};
    this._venue = options.venue || null;

    this._data = {};
  }

  Mappedin.prototype._getJSON = function (url, cb) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    if (this._accessToken) {
      xhr.setRequestHeader('Authorization', 'Bearer ' + this._accessToken);
    } else if (this._clientId && this._clientSecret) {
      xhr.setRequestHeader('Authorization', 'Basic ' + btoa(this._clientId + ':' + this._clientSecret));
    }
    xhr.onload = function () {
      switch (xhr.status) {
        case 200:
          var result = {
            status: xhr.stats,
            headers: {
              link: xhr.getResponseHeader('link')
            },
            data: JSON.parse(xhr.responseText)
          };
          cb(null, result);
          break;
        case 400:
          var details = JSON.parse(xhr.responseText).details;
          var message = '';
          for (var i = 0, iLen = details.length; i < iLen; ++i) {
            if (i) message += ', ';
            message += details[i].message;
          }
          cb(new Error(message));
          break;
        case 401:
          cb(new Error('authentication failed'));
          break;
        case 403:
          cb(new Error('authenticated succeeded, but authorization failed'));
          break;
        case 404:
          cb(new Error('not found'));
          break;
        case 500:
        case 502:
          cb(new Error('server error'));
          break;
        case 503:
        case 504:
          cb(new Error('server unavailable'));
          break;
        default:
          cb(new Error('unknown error'));
          break;
      }
    };
    xhr.onerror = function () {
      cb(new Error('network error'));
    };
    xhr.send();
  };

  function stringifyQuery(query) {
    var queryString = '';
    if (query != null) {
      var ampersand = false;
      var keys = Object.keys(query);
      for (var i = 0, iLen = keys.length; i < iLen; ++i) {
        var name = keys[i];
        var value = query[name];
        if (value != null) {
          queryString += (ampersand ? '&' : '?')
            + encodeURIComponent(name) + '='
            + encodeURIComponent(value);
          ampersand = true;
        }
      }
    }
    return queryString;
  }

  function parseNextLink(linkHeader) {
    if (!linkHeader) {
      return null;
    }
    var linkValues = linkHeader.replace(/,\s*</g, ',\0<').split('\0');
    for (var i = 0, iLen = linkValues.length; i < iLen; ++i) {
      var linkValue = linkValues[i];
      var linkValueMatch = /^\s*<(.+)>\s*;/.exec(linkValue);
      if (!linkValueMatch) {
        continue;
      }
      var uriReference = linkValueMatch[1];
      var linkParamsStartIndex = linkValueMatch.index + linkValueMatch[0].length;
      var linkParams = linkValue.slice(linkParamsStartIndex).split(';');
      for (var j = 0, jLen = linkParams.length; j < jLen; ++j) {
        var linkParam = linkParams[j];
        var linkParamMatch = /^\s*(.+)\s*=\s*"?([^"]+)"?\s*$/.exec(linkParam);
        if (!linkParamMatch) {
          continue;
        }
        var parmname = linkParamMatch[1];
        var ptoken = linkParamMatch[2];
        if (parmname === 'rel' && ptoken === 'next') {
          return uriReference;
        }
      }
    }
    return null;
  }

  Mappedin.prototype._getArray = function (pathname, query, cb) {
    var array;
    var that = this;
    var url = this._baseUrl + pathname + stringifyQuery(query);
    this._getJSON(url, function onresponse(err, res) {
      if (err) return cb(err);
      var data = res.data;
      if (!Array.isArray(data)) {
        cb(new Error('invalid response'));
        return;
      }
      if (array) {
        for (var i = 0, iLen = data.length; i < iLen; ++i) {
          array.push(data[i]);
        }
      } else {
        array = data;
      }
      var next = parseNextLink(res.headers.link);
      if (next) {
        that._getJSON(next, onresponse);
        return;
      }
      cb(null, array);
    });
  };

  Object.keys(THINGS).forEach(function (name) {
    defineGetter(Mappedin, name, function () {
      var array = this._data[name];
      if (array === undefined) {
        throw new Error(name + ' were not fetched');
      }
      return array;
    });
  });

  Mappedin.prototype._fetchAll = function (cb) {
    var things = this._things;
    var didInvokeCallback = false;
    var names = Object.keys(things);
    var total = names.length;
    var progress = 0;
    function onfetched(name, err, data) {
      if (didInvokeCallback) {
        return;
      }
      if (err) {
        didInvokeCallback = true;
        cb(err);
        return;
      }
      this._data[name] = data;
      if (++progress >= total) {
        didInvokeCallback = true;
        cb();
      }
    }
    for (var i = 0, iLen = names.length; i < iLen; ++i) {
      var name = names[i];
      THINGS[name]._fetch(this, onfetched.bind(this, name));
    }
    if (total <= 0) {
      setTimeout(cb, 0);
    }
  };

  function isString(value) {
    return typeof value === 'string' && value.length > 0;
  }

  function isThings(things) {
    if (things == null || typeof things !== 'object') {
      return false;
    }
    var keys = Object.keys(things);
    for (var i = 0, iLen = keys.length; i < iLen; ++i) {
      var props = things[keys[i]];
      if (!Array.isArray(props)) {
        return false;
      }
      for (var j = 0, jLen = props.length; j < jLen; ++j) {
        if (!isString(props[j])) {
          return false;
        }
      }
    }
    return true;
  }

  Mappedin.init = function (options, cb) {
    if (!options) {
      throw new TypeError('options must be an Object');
    }
    if (!(isString(options.clientId) && isString(options.clientSecret)) && !isString(options.accessToken)) {
      throw new Error('{clientId,clientSecret} must be a String or accessToken must be a String');
    }
    if (!isString(options.perspective)) {
      throw new Error('perspective must be a String');
    }
    if (!isThings(options.things)) {
      throw new Error('things must be an Object of [Array of String]');
    }
    if (!isString(options.venue)) {
      throw new Error('venue must be a String');
    }
    var mappedin = new Mappedin(options);
    mappedin._fetchAll(function (err) {
      if (err) return cb(err);
      cb(null, mappedin);
    });
  };

  Mappedin.LEAFLET_POLYGONS = {
    categories: ['name'],
    locations: ['name', 'description', 'logo', 'color'],
    maps: ['name', 'elevation', 'perspectives', 'tiles', 'width', 'height', 'original'],
    polygons: ['vertexes'],
  };

  exports.Mappedin = Mappedin;
} (window));