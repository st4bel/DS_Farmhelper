// ==UserScript==
// @name        DS_Farm_Reborn
// @namespace   de.die-staemme
// @version     0.10
// @description This script is automatically pressing the A/B/C button(s) on the farm assistent page. Reworked version of DS_Farmhelper.
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @match       https://*.die-staemme.de/game.php?*screen=am_farm*
// @include     https://*.die-staemme.de/game.php?*screen=am_farm*
// @copyright   2017+, the stabel, old author: Raznarek
// ==/UserScript==

var $ = typeof unsafeWindow != 'undefined' ? unsafeWindow.$ : window.$;
var _version = "0.1";
var _Anleitungslink = "http://blog.ds-kalation.de/";
var _UpdateLink = "https://github.com/st4bel/DS_Farmhelper/releases";

var _config = {"running":"false","debug":"false","nextline":200,"nextvillage":1000};

$(function(){
  var storage = localStorage;
  var storagePrefix="Farm_r_";
  //Speicherfunktionen
  function storageGet(key,defaultValue) {
      var value= storage.getItem(storagePrefix+key);
      return (value === undefined || value === null) ? defaultValue : value;
  }
  function storageSet(key,val) {
      storage.setItem(storagePrefix+key,val);
  }

  storageSet("config",storageGet("config",JSON.stringify(_config)));
  init_UI();



  function init_UI(){
      //create UI_link
      var overview_menu = $("#overview_menu");
      var option_link = $("<a>")
      .attr("href","#")
      .attr("id","option_link")
      .text("Farm!")
      .click(function(){
          toggleSettingsVisibility();
      });
      var status_symbol = $("<span>")
      .attr("title","DS_Box Status")
      .attr("id","status_symbol")
      .attr("class",getSymbolStatus())
      .prependTo(option_link);
      $("#menu_row").prepend($("<td>").attr("class","menu-item").append(option_link));

      //options popup
      var settingsDivVisible = false;
      var overlay=$("<div>")
      .css({
          "position":"fixed",
          "z-index":"99999",
          "top":"0",
          "left":"0",
          "right":"0",
          "bottom":"0",
          "background-color":"rgba(255,255,255,0.6)",
          "display":"none"
      })
      .appendTo($("body"));
      var settingsDiv=$("<div>")
      .css({
          "position":"fixed",
          "z-index":"100000",
          "left":"50px",
          "top":"50px",
          "width":"500px",
          "height":"400px",
          "background-color":"white",
          "border":"1px solid black",
          "border-radius":"5px",
          "display":"none",
          "padding":"10px"
      })
      .appendTo($("body"));
      function toggleSettingsVisibility() {
          if(settingsDivVisible) {
              overlay.hide();
              settingsDiv.hide();
          } else {
              overlay.show();
              settingsDiv.show();
          }

          settingsDivVisible=!settingsDivVisible;
      }
      //Head
      $("<h2>").text("Einstellungen DS_Farm_Reborn").appendTo(settingsDiv);
      $("<span>").text("Version: "+_version+" ").appendTo(settingsDiv);
      $("<button>").text("Update").click(function(){
          window.open(_UpdateLink,'_blank');
      }).appendTo(settingsDiv);
      //Body
      /*
      var settingsTable=$("<table>").appendTo(settingsDiv);
      function addRow(desc,content){
        $("<tr>")
        .append($("<td>").append(desc))
        .append($("<td>").append(content))
        .appendTo(settingsTable);
      }
      var select_units = $("<select>")
      .append($("<option>").text("Alle").attr("value","normal"))
      .append($("<option>").text("Alle außer Bögen").attr("value","no_archer"))
      .append($("<option>").text("Alle außer Paladin").attr("value","no_knight"))
      .append($("<option>").text("keine Bögen sowie Paladin").attr("value","no_archer_knight"))
      .change(function(){
        var config = JSON.parse(storageGet("config"));
        config.units = $("option:selected",$(this)).val();
        storageSet("config",JSON.stringify(config));
      });
      $("option[value="+JSON.parse(storageGet("config")).units+"]",select_units).prop("selected",true);

      var input_rereadtime = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).rereadtime)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        if(parseInt($(this).val())>Math.ceil(config.criticaltime/30)){ // reread > 2*critical (vorsichtig)
          config.rereadtime = parseInt($(this).val());
          storageSet("config",JSON.stringify(config));
        }
      });
      var input_criticaltime = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).criticaltime)
      .on("input",function(){
        if(parseInt($(this).val())>0){
          var config = JSON.parse(storageGet("config"));
          config.criticaltime = parseInt($(this).val());
          storageSet("config",JSON.stringify(config));
        }
      });
      var input_buffertime = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).frontbuffer)
      .on("input",function(){
        if(parseInt($(this).val())>0){
          var config = JSON.parse(storageGet("config"));
          config.frontbuffer = parseInt($(this).val());
          config.backbuffer = parseInt($(this).val());
          storageSet("config",JSON.stringify(config));
        }
      });
      var select_debug = $("<select>")
      .append($("<option>").text("Aus").attr("value","false"))
      .append($("<option>").text("An").attr("value","true"))
      .change(function(){
        var config = JSON.parse(storageGet("config"));
        config.debug = $("option:selected",$(this)).val();
        storageSet("config",JSON.stringify(config));
        console.log(storageGet("config"))
      });
      $("option[value="+JSON.parse(storageGet("config")).debug+"]",select_debug).prop("selected",true);

      $("<tr>").append($("<td>").attr("colspan",2).append($("<span>").attr("style","font-weight: bold;").text("Allgemein:"))).appendTo(settingsTable);
      addRow(
      $("<span>").text("Einheiten auf dieser Welt: "),
      select_units);
      addRow(
      $("<span>").text("Debugmodus: "),
      select_debug);
      $("<tr>").append($("<td>").attr("colspan",2).append($("<span>").attr("style","font-weight: bold;").text("Zeiten:"))).appendTo(settingsTable);
      addRow(
      $("<span>").text("Die nächsten x Minuten einlesen: "),
      input_rereadtime);
      addRow(
      $("<span>").text("Feindliche Angriffe, die weniger \nals x Sekunden entfernt sind zusammenfassen:"),
      input_criticaltime);
      addRow(
      $("<span>").text("'Angstsekunden' (<0): "),
      input_buffertime);
      */
      //Foot
      $("<button>").text("Start/Stop").click(function(){
          toggleRunning();
      }).appendTo(settingsDiv);
      $("<button>").text("Schließen").click(function(){
          toggleSettingsVisibility();
      }).appendTo(settingsDiv);
      $("<button>").text("Anleitung").click(function(){
          window.open(_Anleitungslink, '_blank');
      }).appendTo(settingsDiv);
  }
  function toggleRunning(){
      var config = JSON.parse(storageGet("config"));
      config.running = ""+(config.running==="false");
      add_log("running set to "+config.running);
      storageSet("config",JSON.stringify(config));
      location.reload();
  }
  function getSymbolStatus(){
      if(JSON.parse(storageGet("config")).running==="true"){
          return "icon friend online";
      }else{
          return "icon friend offline";
      }
  }
  function add_log(text){
    if(JSON.parse(storageGet("config")).debug==="true"){
      var prefix = storagePrefix+timeConverter(Date.now())+" - ";
      console.log(prefix+text);
    }
  }
  function timeConverter(timestamp){
    var a = new Date(timestamp);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
    return time;
  }
  function randomInterval(min,max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  function percentage_randomInterval(average,deviation){
    average=parseInt(average);
    deviation = deviation > 100 ? 1 : deviation/100;
    return randomInterval(average*(1+deviation),average*(1-deviation));
  }
  function getPageAttribute(attribute){
    //gibt die php-Attribute zurück, also z.B. von* /game.php?*&screen=report* würde er "report" wiedergeben
    //return: String, wenn nicht vorhanden gibt es eine "0" zurück
    var params = document.location.search;
    var value = params.substring(params.indexOf(attribute+"=")+attribute.length+1,params.indexOf("&",params.indexOf(attribute+"=")) != -1 ? params.indexOf("&",params.indexOf(attribute+"=")) : params.length);
    return params.indexOf(attribute+"=")!=-1 ? value : "0";
  }
});
