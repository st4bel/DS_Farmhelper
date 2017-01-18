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

var _config = {"running":"false","debug":"true","units":"no_archer","walk_dir":"right","max_farmpage":10,"max_distance":-1,"max_last_visit":-1,"max_wall":20,"nextline":200,"nextvillage":1000,"primary_button":"c","secondary_button":"a","double_attack":"false"};
var _units = {
    "normal":["spear","sword","axe","archer","spy","light","marcher","heavy"],
    "no_archer":["spear","sword","axe","spy","light","heavy"]
};
/*
 * Mode: c: no spy button? to old button?
 * Mode: a/b, wenn truppen leer secondary
 */
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

  storageSet("config",JSON.stringify(_config));//storageGet("config",JSON.stringify(_config)));

  var autoRun = JSON.parse(storageGet("config")).running==="true";
  addlog("init_UI...");
  init_UI();
  if(autoRun){
      if(getPageAttribute("screen")=="am_farm"){

          onFarm();
      }
  }
  function onFarm(){
    addlog("onFarm...");
    var rows = $("div.body > table tr").slice(1);
    var current = -1;
    var config = JSON.parse(storageGet("config"));
    (function tick(){
      if(!autoRun) {
        add_log("Stopped");
        return;
      }
      current++;
      addlog("tick #"+current);
      if(current > rows.length){
        nextPage();
      }
      var row = rows[current];
      var distance = parseInt($("td",row).eq(7).text());
      var wall = $("td",row).eq(6).text()!="?" ? parseInt($("td",row).eq(6).text()) : 0;
      var last_visit = getLastVisit(row);
      //cancel if to far
      addlog("distance: "+distance+", if "+(distance<=config.max_distance||config.max_distance==-1));
      if(distance<=config.max_distance||config.max_distance==-1){
        addlog("last_visit + maxlast: "+(last_visit+config.max_last_visit*1000*3600)+" Date: "+Date.now()+" if: "+(last_visit+config.max_last_visit*1000*3600>Date.now()));
        if(last_visit+config.max_last_visit*1000*3600>Date.now()){
          addlog("isattacked? "+isAttacked());
          if(config.double_attack==="true"||!isAttacked()){
            if(unitCheck(config.primary_button)&&canPress(row,config.primary_button)){
              press(row,config.primary_button);
              setTimeout(function(){
                tick();
              },percentage_randomInterval(config.nextline,5));
            }else if(unitCheck(config.secondary_button)&&canPress(row,config.secondary_button)){
              press(row,config.secondary_button);
              setTimeout(function(){
                tick();
              },percentage_randomInterval(config.nextline,5));
            }else{
              setTimeout(function(){
                nextvillage();
              },percentage_randomInterval(config.nextvillage,5));
            }
          }
        }else if(unitCheck(config.secondary_button)){
          press(row,config.secondary_button);
          setTimeout(function(){
            tick();
          },percentage_randomInterval(config.nextline,5));
        }else{
          setTimeout(function(){
            nextvillage();
          },percentage_randomInterval(config.nextvillage,5));
        }
      }else{
        setTimeout(function(){
          nextvillage();
        },percentage_randomInterval(config.nextvillage,5));
      }
    })();
  }
  function unitCheck(button){
    //returns true false
    addlog("checking for available units...");
    config = JSON.parse(storageGet("config"));
    if(button=="c"){
      return sumCheckedUnits(getUnitInfo())>0;
    }else{
      var check = true;
      var unit_info =getUnitInfo();
      button = button == "a" ? 0:1;
      var table = $("form").eq(button);
      for(var name in unit_info){
        var thisunit = parseInt($("input[name='"+name+"']").val());
        if(unit_info[name].count<thisunit){
          check=false;
        }
      }
      return check;
    }
    add_log("unitCheck: button not a/b/c, but "+button);
    return false;
  }
  function getLastVisit(row){
    var text = $("td",row).eq(4).text();
    text.replace(/heute/,(new Date()).getDate()+"."+((new Date()).getMonth()+1)+".").replace(/gestern/,((new Date()).getDate()-1)+"."+((new Date()).getMonth()+1)+".");
    var last_visit = text.replace(/am | um /g,"").replace(/\./g,":").split(":");
    //heute um 14:35:00
    var ts = new Date();
    ts.setDate(last_visit[0]);
    ts.setMonth(parseInt(last_visit[1])-1);
    ts.setHours(last_visit[2]);
    ts.setMinutes(last_visit[3]);
    ts.setSeconds(last_visit[4]);
    return ts;
  }
  function getPageNumber() {
      var res=/&Farm_page=([0-9]*)&/.exec(location.search);
      if(res==null){return 0;}
      else return parseInt(res[1]);
  }

  //gibt die hoechste moegliche farmseite zurueck
  function getMaxPageNumber() {
      return $("div.body table tr:last-child a.paged-nav-item").length+1;
  }

  //wechselt zur naechsten farmseite, oder wenn noetig, zum naechsten dorf
  function nextPage() {
      var current=getPageNumber();
      var total=getMaxPageNumber();

      if(JSON.parse(storageGet("config")).max_farmpage != 0) {
          total = Math.min(JSON.parse(storageGet("config")).max_farmpage , total);
      }
      var nextVillage=false;
      current++;
      if(current>=total) {
        current=0;
        nextvillage();
      }else{
        location.href="/game.php?Farm_page="+current+"&screen=am_farm";
      }
  }
  function nextvillage(){
    location.href=$("#village_switch_"+JSON.parse(storageGet("config")).walk_dir).attr("href");
  }
  function isAttacked(row) {
    return $("td:eq(3) img",row).length==1;
  }
  function canPress(row,name) {
    var button=$("a.farm_icon_"+name,row);
    return button.length==1 && !button.hasClass("farm_icon_disabled");
  }
  function press(row,name) {
    $("a.farm_icon_"+name,row).click();
  }
  function getUnitInfo() {
      var unitsHome=$("#units_home");
      var units={};

      $(".unit-item",unitsHome).each(function(index,obj){
          obj=$(obj);
          units[obj.attr("id")] = { count:parseInt(obj.text()), checked:false };
      });
      $("input[type=checkbox]",unitsHome).each(function(index,obj){
          obj=$(obj);
          units[obj.attr("name")].checked = obj.prop("checked");
      });

      return units;
  }
  function sumCheckedUnits(unitInfo) {
      var sum=0;
      for(var unitName in unitInfo) {
          var unit=unitInfo[unitName];
          sum += unit.checked ? unit.count : 0;
      }
      return sum;
  }
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
