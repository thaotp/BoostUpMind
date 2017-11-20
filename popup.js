/*global chrome */

(function () {

    'use strict';

    // var url = {
    //   words: 'https://jp-learn.herokuapp.com/api/v1/words',
    //   boost: 'https://jp-learn.herokuapp.com/api/v1/randoms/boost'
    // }
    var url = {
      words: 'http://localhost:5000/api/v1/words',
      boost: 'http://localhost:5000/api/v1/randoms/boost'
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
      module.filterRender($(e.currentTarget).val())
      module.eventChange();

    });
    document.getElementById('js-display').addEventListener('change', function (e) {
      module.filterDisplay($(e.currentTarget).val())
      module.saveOptions();
    });
    document.getElementById('js-display').value = options.settings['boost:params'].display
    document.getElementById('js-type').value = options.settings['boost:params'].type
    // Set hide/show data
    module.filterDisplay(options.settings['boost:params'].display)
    // Filter render data
    module.filterRender(options.settings['boost:params'].type)
    document.body.scrollTop = options.settings['boost:params'].pos
    document.getElementById('js-lesson').value = options.settings['boost:params'].lesson
    module.wordSearch();
    module.bindTabtoNext();
  }

  module.repeatTypeEvent = function(){
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
          var counter = $(e.currentTarget).parent().find('.counter')
          counter.html(+counter.html() + 1)
        }
      }
    })

    $('#js-w li').on('click', function(e){
      module.saveOptions({pos: document.body.scrollTop})
    });
  }

  module.init = function(){
    module.renderResults(options.data)
    module.bindEvents();
  }

  module.eventChange = function(){
    var data = module.saveOptions();

    module.fetchRecords({'boost:params': data}, function(new_options){
      options = new_options
      module.renderResults(options.data)
    })
  }

  module.saveOptions = function(options){
    var data = !options ? {pos: 0} : options
    data.lesson = document.getElementById('js-lesson').value
    data.type = document.getElementById('js-type').value
    data.display = document.getElementById('js-display').value
    chrome.storage.local.set({'boost:params': data}, function() {
      if (!chrome.runtime.error) {

      }
    });
    return data;
  }

  module.fetchRecords = function(items, callback){
    // var url = 'https://jp-learn.herokuapp.com/api/v1/randoms/boost'
    var url = 'http://localhost:5000/api/v1/randoms/boost'
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
    $('.js-in').parents('li').removeClass('active')
    $(this).parent('li').addClass('active')
    $('.js-in').not(this).find('.js-inp').hide();
    $(e.target).find('.js-inp').show()
    $(e.target).find('.js-inp').focus()
  }

  module.bindTabtoNext = function(){
    $('.container').keydown( function(event) {
        if(event.keyCode == 9) { //Tab
          event.preventDefault();
          if($('.active').length > 0){
            if($('.container .active').next().length > 0){
              $('.container .active').next().find('div').trigger('click')
            }else{
              $('.container').find('li div').first().trigger('click')
            }
          }
        }else{

        }
    });

  }

  module.wordSearch = function(){
    var minlength = 2;
    if(options.settings['boost:params'].type == 'kanji') minlength = -1;
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
            // url: "https://jp-learn.herokuapp.com/api/v1/words/search",
            url: "http://localhost:5000/api/v1/words/search",
            data: {
                'word' : value,
                'type' : document.getElementById('js-type').value,
                'lesson' : document.getElementById('js-lesson').value
            },
            dataType: "text",
            success: function(data){
              module.renderResults(JSON.parse(data))
            }
          });
        }else if(value.length == 0){
          module.renderResults(options.data)
          document.body.scrollTop = options.settings['boost:params'].pos
        }
    });
  }

  module.renderResults = function(words){
    var type = options.settings['boost:params'].type
    switch (type) {
      case 'word':
        var content = ''
        $.each(words, function(index, word){
          word.index = index
          word.correct = (word.kanji != '') ? word.kanji : word.hiragana
          content += tmpl("js-words", word);
        });
        break
      case 'kanji':
        $.each(words, function(index, kanji){
          kanji.index = index
          content += tmpl("js-kanji", kanji);
        });
        break
      case 'grammar':
        $.each(words, function(index, grammar){
          grammar.index = index
          grammar.uses = module.splitObject(grammar.use)
          grammar.examples = module.splitObject(grammar.example)
          content += tmpl("js-grammars", grammar);
        });
        break
    }
    document.getElementById('js-w').innerHTML = content;
    module.repeatTypeEvent()
  }

  // Functions secondary

  module.filterDisplay = function(display){
    if(display == 'hiragana'){
      $('#js-w').removeClass('mean').addClass('hiragana')
    }else if(display == 'mean'){
      $('#js-w').removeClass('hiragana').addClass('mean')
    }else{
      $('#js-w').removeClass('hiragana mean')
    }
  }

  module.filterRender = function(type){
    if(type == 'word'){
      $('#js-lesson').html(module.optLessonInit())
    }else{
      $('#js-lesson').html(module.optKanjiInit())
    }
  }

  module.optLessonInit = function(){
    var opt = ''
    for (i = 1; i <= 50; i++) {
      opt += "<option value=" + i + ">" + i + "</option>";
    }
    for (i = 1; i <= 25; i++) {
      var value = 'u' + i
      opt += "<option value=" + value + ">Unit " + i + "</option>";
    }
    return opt;
  }

  module.optKanjiInit = function(){
    var opt = ''
    for (i = 5; i >= 1; i--) {
      opt += "<option value=" + i + ">N" + i + "</option>";
    }
    return opt;
  }

  module.splitObject = function(obj){
    var results = []
    if( obj == null ){
      results = []
    }else{
      results = obj.split("\n")
    }
    return results
  }

}
