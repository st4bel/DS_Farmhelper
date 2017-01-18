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

var _config = {"running":"false","debug":"true","units":"no_archer","walk_dir":"right","max_farmpage":10,"max_distance":-1,"max_last_visit":-1,"max_wall":20,"nextline":200,"nextline_fast":25,"nextvillage":1000,"primary_button":"c","secondary_button":"a","double_attack":"false","max_secondary":20};
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

  storageSet("config",storageGet("config",JSON.stringify(_config)));
  storageSet("sec_counter",storageGet("sec_counter",0));

  var autoRun = JSON.parse(storageGet("config")).running==="true";
  add_log("init_UI...");
  init_UI();
  if(autoRun){
      if(getPageAttribute("screen")=="am_farm"){
          onFarm();
      }
  }
  function onFarm(){
    add_log("onFarm...");
    var rows = $("div.body > table tr").slice(1);
    var current = -1;
    var config = JSON.parse(storageGet("config"));
    var secondary_counter=storageGet("sec_counter");
    (function tick(){
      if(!autoRun) {
        add_log("Stopped");
        return;
      }
      current++;
      add_log("tick #"+current);
      if(current > rows.length){
        storageSet("sec_counter",secondary_counter);
        nextPage();
      }
      if(secondary_counter>config.max_secondary){
        nextvillage();
      }
      var row = rows[current];
      var distance = parseInt($("td",row).eq(7).text());
      var wall = $("td",row).eq(6).text()!="?" ? parseInt($("td",row).eq(6).text()) : 0;
      var last_visit = getLastVisit(row);
      add_log("last_visit "+last_visit)
      //cancel if to far
      add_log("distance: "+Math.round(distance)+", if "+(distance<=config.max_distance||config.max_distance==-1));
      if(distance<=config.max_distance||config.max_distance==-1){

        add_log("last_visit + maxlast: "+(last_visit+config.max_last_visit*1000*3600)+" Date: "+Date.now()+" if: "+(last_visit+config.max_last_visit*1000*3600>Date.now()));
        if(last_visit+config.max_last_visit*1000*3600>Date.now()||config.last_visit==-1){

          add_log("isattacked? "+isAttacked(row));
          if(config.double_attack==="true"||!isAttacked(row)){
            add_log("prim: "+unitCheck(config.primary_button)+", sec: "+unitCheck(config.secondary_button))
            if(unitCheck(config.primary_button)&&canPress(row,config.primary_button)){
              press(row,config.primary_button,"green");
              secondary_counter=0;
              setTimeout(function(){
                tick();
              },percentage_randomInterval(config.nextline,5));
            }else if(unitCheck(config.secondary_button)&&canPress(row,config.secondary_button)){
              press(row,config.secondary_button,"blue");
              secondary_counter++;
              setTimeout(function(){
                tick();
              },percentage_randomInterval(config.nextline,5));
            }else{
              setTimeout(function(){
                add_alert("next village / keine truppen")
                nextvillage();
              },percentage_randomInterval(config.nextvillage,5));
            }
          }else{
            add_log("village under attack..")
            setTimeout(function(){
              $("td",row).css("background-color","red");
              tick();
            },percentage_randomInterval(config.nextline_fast,5));
          }
        }else if(unitCheck(config.secondary_button)){
          press(row,config.secondary_button,"orange");
          secondary_counter++;
          setTimeout(function(){
            tick();
          },percentage_randomInterval(config.nextline,5));
        }else{
          setTimeout(function(){
            add_alert("next village / lastvisit / keine sekundären truppen")
            nextvillage();
          },percentage_randomInterval(config.nextvillage,5));
        }
      }else{
        setTimeout(function(){
          add_alert("next village / zu weit")
          nextvillage();
        },percentage_randomInterval(config.nextvillage,5));
      }
    })();
  }
  function unitCheck(button){
    //returns true false
    add_log("checking for available units...");
    config = JSON.parse(storageGet("config"));
    if(button==""){
      return false;
    }else  if(button=="c"){
      return sumCheckedUnits(getUnitInfo())>0;
    }else{
      var check = true;
      var unit_info =getUnitInfo();
      button = button == "a" ? 0:1;
      var table = $("form").eq(button);
      for(var name in unit_info){
        var thisunit = parseInt($("input[name='"+name+"']",table).val());
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
    add_log("getting last visit....");
    var text = $("td",row).eq(4).text();
    var date = new Date(Date.now());
    text = text.replace(/heute/,date.getDate()+"."+(date.getMonth()+1)+".").replace(/gestern/,(date.getDate()-1)+"."+(date.getMonth()+1)+".");
    var last_visit = text.replace(/am | um /g,"").replace(/\./g,":").split(":");
    var ts = new Date();
    ts.setDate(last_visit[0]);
    ts.setMonth(parseInt(last_visit[1])-1);
    ts.setHours(last_visit[2]);
    ts.setMinutes(last_visit[3]);
    ts.setSeconds(last_visit[4]);
    return ts.getTime();
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
    storageSet("sec_counter",0);
    location.href=$("#village_switch_"+JSON.parse(storageGet("config")).walk_dir).attr("href");
  }
  function isAttacked(row) {
    return $("td:eq(3) img",row).length==1;
  }
  function canPress(row,name) {
    var button=$("a.farm_icon_"+name,row);
    return button.length==1 && !button.hasClass("farm_icon_disabled");
  }
  function press(row,name,color) {
    $("td",row).css("background-color",color);
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
      var settingsTable=$("<table>").appendTo(settingsDiv);
      function addRow(desc,content){
        $("<tr>")
        .append($("<td>").append(desc))
        .append($("<td>").append(content))
        .appendTo(settingsTable);
      }
      var select_walk_dir = $("<select>")
      .append($("<option>").text("Auf").attr("value","right"))
      .append($("<option>").text("Ab").attr("value","left"))
      .change(function(){
        var config = JSON.parse(storageGet("config"));
        config.walk_dir = $("option:selected",$(this)).val();
        storageSet("config",JSON.stringify(config));
      });
      $("option[value="+JSON.parse(storageGet("config")).walk_dir+"]",select_walk_dir).prop("selected",true);

      var input_max_farmpage = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).max_farmpage)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.max_farmpage = parseInt($(this).val());
        storageSet("config",JSON.stringify(config));
      });

      var input_max_distance = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).max_distance)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.max_distance = parseInt($(this).val());
        storageSet("config",JSON.stringify(config));
      });

      var input_max_lastvisit = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).max_last_visit)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.max_last_visit = parseInt($(this).val());
        storageSet("config",JSON.stringify(config));
      });

      var input_max_wall = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).max_wall)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.max_wall = parseInt($(this).val());
        storageSet("config",JSON.stringify(config));
      });

      var input_nextline = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).nextline)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.nextline = parseInt($(this).val());
        storageSet("config",JSON.stringify(config));
      });

      var input_nextline_fast = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).nextline_fast)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.nextline_fast = parseInt($(this).val());
        storageSet("config",JSON.stringify(config));
      });

      var input_nextvillage = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).nextvillage)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.nextvillage = parseInt($(this).val());
        storageSet("config",JSON.stringify(config));
      });

      var input_max_wall = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).max_wall)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.max_wall = parseInt($(this).val());
        storageSet("config",JSON.stringify(config));
      });
      var input_max_secondary = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).max_secondary)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.max_secondary = parseInt($(this).val());
        storageSet("config",JSON.stringify(config));
      });

      var select_primary = $("<select>")
      .append($("<option>").text("A").attr("value","a"))
      .append($("<option>").text("B").attr("value","b"))
      .append($("<option>").text("C").attr("value","c"))
      .change(function(){
        var config = JSON.parse(storageGet("config"));
        config.primary_button = $("option:selected",$(this)).val();
        storageSet("config",JSON.stringify(config));
      });
      $("option[value="+JSON.parse(storageGet("config")).primary_button+"]",select_primary).prop("selected",true);

      var select_secondary = $("<select>")
      .append($("<option>").text("Keine").attr("value"," "))
      .append($("<option>").text("A").attr("value","a"))
      .append($("<option>").text("B").attr("value","b"))
      .append($("<option>").text("C").attr("value","c"))
      .change(function(){
        var config = JSON.parse(storageGet("config"));
        if($("option:selected",$(this)).val()==config.primary_button){
          alert("Secondary button may not correspond to the primary button!");
          $("option[value="+JSON.parse(storageGet("config")).secondary_button+"]",select_secondary).prop("selected",true);
        }else{
          config.secondary_button = $("option:selected",$(this)).val();
          storageSet("config",JSON.stringify(config));
        }
      });
      $("option[value="+JSON.parse(storageGet("config")).secondary_button+"]",select_secondary).prop("selected",true);

      var select_doubleattack = $("<select>")
      .append($("<option>").text("Ja").attr("value","true"))
      .append($("<option>").text("Nein").attr("value","false"))
      .change(function(){
        var config = JSON.parse(storageGet("config"));
        config.double_attack = $("option:selected",$(this)).val();
        storageSet("config",JSON.stringify(config));
      });
      $("option[value="+JSON.parse(storageGet("config")).double_attack+"]",select_doubleattack).prop("selected",true);

      var select_debug = $("<select>")
      .append($("<option>").text("Aus").attr("value","false"))
      .append($("<option>").text("An").attr("value","true"))
      .append($("<option>").text("Keine Alerts").attr("value","no_alert"))
      .change(function(){
        var config = JSON.parse(storageGet("config"));
        config.debug = $("option:selected",$(this)).val();
        storageSet("config",JSON.stringify(config));
        console.log(storageGet("config"))
      });
      $("option[value="+JSON.parse(storageGet("config")).debug+"]",select_debug).prop("selected",true);


      $("<tr>").append($("<td>").attr("colspan",2).append($("<span>").attr("style","font-weight: bold;").text("Allgemein:"))).appendTo(settingsTable);
      addRow(
      $("<span>").text("Debugmodus: "),
      select_debug);
      addRow(
      $("<span>").text("Dorf-Traversierung: "),
      select_walk_dir);
      addRow(
      $("<span>").text("Maximale Farmseite: "),
      input_max_farmpage);
      $("<tr>").append($("<td>").attr("colspan",2).append($("<span>").attr("style","font-weight: bold;").text("Pausen:"))).appendTo(settingsTable);
      addRow(
      $("<span>").text("Pause zwischen Angriffen (in ms): "),
      input_nextline);
      addRow(
      $("<span>").text("Pause, wenn kein Angriff geschickt wurde (in ms): "),
      input_nextline_fast);
      addRow(
      $("<span>").text("Pause beim Dorfwechsel (in ms): "),
      input_nextvillage);
      $("<tr>").append($("<td>").attr("colspan",2).append($("<span>").attr("style","font-weight: bold;").text("Angriffsmodus:"))).appendTo(settingsTable);
      addRow(
      $("<span>").text("maximaler Wall: "),
      input_max_wall);
      addRow(
      $("<span>").text("maximale Distanz: "),
      input_max_distance);
      addRow(
      $("<span>").text("Zeit seit letztem Angriff für primären Button in h: "),
      input_max_lastvisit);
      addRow(
      $("<span>").text("primärer Angriffsbutton: "),
      select_primary);
      addRow(
      $("<span>").text("sekundärer Angriffsbutton: "),
      select_secondary);
      addRow(
      $("<span>").text("sekundärer Angriffsbutton nur x mal am stück benutzen, bis ins nächste dorf gewechselt wird: "),
      input_max_secondary);
      addRow(
      $("<span>").text("derzeit attackierte Dörfer mehrfach angreifen: "),
      select_doubleattack);

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
      /*{"units":"no_archer",
      "primary_button":"c","secondary_button":"a","double_attack":"false"};*/
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
    if(JSON.parse(storageGet("config")).debug!=="false"){
      var prefix = storagePrefix+timeConverter(Date.now())+" - ";
      console.log(prefix+text);
    }
  }
  function add_alert(text){
    if(JSON.parse(storageGet("config")).debug==="true"){
      var prefix = storagePrefix+timeConverter(Date.now())+" - ";
      alert(prefix+text);
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
