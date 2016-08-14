/*global chrome */

(function () {

    'use strict';

    var url = {
      words: 'https://jp-learn.herokuapp.com/api/v1/words',
      boost: 'https://jp-learn.herokuapp.com/api/v1/randoms/boost'
    }

    var fetchRecords = function(items, callback){
      var xhr = new XMLHttpRequest();
      xhr.open("GET", url.boost + '?type='+items['boost:params'].type+'&lesson='+items['boost:params'].lesson, true);
      xhr.onreadystatechange = function() {
        if (xhr.readyState == 4) {
          var options = {}
          options.data = JSON.parse(xhr.responseText);
          options.settings = items
          callback(options)
        }
      }
      xhr.send();
    }

    document.addEventListener('DOMContentLoaded', function () {


      chrome.storage.local.get('boost:params', function(items) {
        if (!chrome.runtime.error) {
          fetchRecords(items, function(options){
            var boostUpBrand = new BoostUpBrand(options)
            boostUpBrand.init()
          })
        }
      });
    });


}());

function BoostUpBrand(options) {
  var module = this;
  module.bindEvents = function() {
    document.getElementById('js-lesson').addEventListener('change', function (e) {
      module.eventChange();

    });

    document.getElementById('js-type').addEventListener('change', function (e) {
      module.eventChange();

    });

    document.getElementById('js-type').value = options.settings['boost:params'].type
    document.getElementById('js-lesson').value = options.settings['boost:params'].lesson

    module.wordSearch();


  }

  module.elEvent = function(){
    var el = document.getElementsByClassName("js-in");
    for (var i = 0; i < el.length; i++) {
      el[i].addEventListener('click', module.bindClick, false);
    }

    $('.js-inp').on('keydown', function(e){
      if(e.keyCode == 13){
        var correct = $(e.currentTarget).data('correct')
        var romaji =  $(e.currentTarget).data('romaji')
        var value = $(e.currentTarget).val()
        if(value == correct || value == romaji ){
          $(e.currentTarget).val('')
        }
      }
    })
  }

  module.init = function(){
    module.render(options.data)
    module.bindEvents();
  }

  module.eventChange = function(){
    var data = {}
    data.lesson = document.getElementById('js-lesson').value
    data.type = document.getElementById('js-type').value
    chrome.storage.local.set({'boost:params': data}, function() {
      if (!chrome.runtime.error) {

      }
    });

    module.fetchRecords({'boost:params': data}, function(new_options){
      options = new_options
      module.render(options.data)
    })
  }



  module.render = function(items){
    document.getElementById('js-w').innerHTML = ''
    var content = ''
    var type = options.settings['boost:params'].type
    switch (type) {
      case 'word':
        items.forEach(function(word, index, array){
          word.index = index
          content += tmpl("js-words", word);
        });
        break
      case 'shadow':
        items.forEach(function(shadow, index, array){
          shadow.index = index
          content += tmpl("js-shadow", shadow);
        });
        break
      case 'kanji':
        break
      case 'grammar':
        break
    }

    document.getElementById('js-w').innerHTML = content;
    module.elEvent()
  }

  module.fetchRecords = function(items, callback){
    var url = 'https://jp-learn.herokuapp.com/api/v1/randoms/boost'
    var xhr = new XMLHttpRequest();
    xhr.open("GET", url + '?type='+items['boost:params'].type+'&lesson='+items['boost:params'].lesson, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var options = {}
        options.data = JSON.parse(xhr.responseText);
        options.settings = items
        callback(options)
      }
    }
    xhr.send();
  }

  module.bindClick = function(e){
    e.preventDefault();
    $('.js-in').not(this).find('.js-inp').hide();
    $(e.target).find('.js-inp').show()
    $(e.target).find('.js-inp').focus()

  }

  module.wordSearch = function(){
    var minlength = 2;
    var searchRequest = null;
    $("#wordSearch").focus();
    $("#wordSearch").keyup(function () {
        $('.js-w').html('')
        var _this = this,
        value = $(this).val().trim();
        if (value.length >= minlength ) {
          if (searchRequest != null) searchRequest.abort();
          searchRequest = $.ajax({
            type: "GET",
            url: "https://jp-learn.herokuapp.com/api/v1/words/search",
            data: {
                'word' : value
            },
            dataType: "text",
            success: function(data){
              module.renderResults(JSON.parse(data))
            }
          });
        }else if(value.length == 0){
          module.renderResults(options.data)
        }
    });
  }

  module.renderResults = function(words){
    var content = ''
    $.each(words, function(index, word){
      word.index = index
      content += tmpl("js-words", word);
    });
    document.getElementById('js-w').innerHTML = content;
  }

}
