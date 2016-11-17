import _ from 'lodash';
import p from 'prelude-ls/lib/index';

var mixin_alias_regex = /(^\s*)=(\s*)/;
var include_alias_regex = /(^\s*)\+(\s*)/;

var warnOnEmptyFile = function (path) {
  console.log('Destination (' + path + ') not written because compiled files were empty.');
};

var replaceIncludeAlias = function(line){
  return line.replace(include_alias_regex, function(match, spacesBefore, spacesAfter){
    return spacesBefore + '@include' + (spacesAfter !== '' ? spacesAfter : ' ');
  });
};

var replaceMixinAlias = function(line){
  return line.replace(mixin_alias_regex, function(match, spacesBefore, spacesAfter){
    return spacesBefore + '@mixin' + (spacesAfter !== '' ? spacesAfter : ' ');
  });
};

var insertBeforeComment = function(inserted, text){
  var index = text.indexOf('//');

  if(index > -1) {
    return text.slice(0, index) + inserted + text.substr(index);
  } else {
    return text + inserted;
  }
};

var splitBefore = function(before, text){
  var index = text.indexOf(before);

  if(index > -1) {
    return [text.slice(0, index), text.substr(index)];
  } else {
    return [text];
  }
};

var insertBeforeClosingBrackets = function(inserted, text){

  var match = text.match(/.*(#{([*+\-\$\w\s\d])*})/);
  var start = '';
  var end = text;

  if(match){
    start = match[0];
    end = text.substr(start.length);
  }

  var splittedBeforeComments = splitBefore('//', end);
  var beforeComments = splittedBeforeComments[0];
  var splittedBeforeBrackets = splitBefore('}', beforeComments);
  var beforeBrackets = splittedBeforeBrackets[0];

  var value = beforeBrackets + inserted;

  if (splittedBeforeBrackets[1]) {
    value += splittedBeforeBrackets[1];
  }
  if (splittedBeforeComments[1]) {
    value += splittedBeforeComments[1];
  }

  return start + value;
};

var convertSassToScss = function(input){
  var lines, lastBlockLineIndex, braces, bracesString;

  function fn$(it){
    return lines.indexOf(it);
  }
  function fn1$(it){
    return it.indentation > lines[idx].indentation;
  }
  
  if (input != null) {

    var raw_lines = _.reject(
      input.split('\n'), // split every lines
      function(line){
        // reject empty or \* *\ comment only lines
        return line.match(/^\s*(\/\*.*\*\/.*)?(\/{2}.*)?$/);
      }
    );

    // Cleanup lines and add indentation information
    lines = _.map(raw_lines, function(line){

      line = replaceIncludeAlias(line);
      line = replaceMixinAlias(line);

      var match = line.match(/^\s+/);

      return {
        indentation: match != null ? match[0].length : 0,
        text: line
      };
    });

    for (var idx in lines) {

      idx = parseInt(idx, 10);
      var line = lines[idx];

      if (line.text.match(/[a-z>~*]+/)) {

        lastBlockLineIndex = p.last(
          p.map(fn$)(
            p.takeWhile(fn1$)(
              p.drop(idx + 1)( lines))));

        if (lastBlockLineIndex != null) {

          lines[idx].text = insertBeforeComment('{', lines[idx].text);
          lines[lastBlockLineIndex].text = insertBeforeComment('}', lines[lastBlockLineIndex].text);
        } else {

          lines[idx].text = insertBeforeClosingBrackets(';', lines[idx].text );
        }
      }
    }

    // Return lines content joined in a single string
    return _.map(lines, function(it){
      return it.text;
    }).join('\n');
  }
};

export default convertSassToScss;