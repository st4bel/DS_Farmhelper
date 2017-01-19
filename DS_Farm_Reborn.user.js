// ==UserScript==
// @name        DS_Farm_Reborn
// @namespace   de.die-staemme
// @version     0.2.2
// @description This script is automatically pressing the A/B/C button(s) on the farm assistent page. Reworked version of DS_Farmhelper.
// @grant       GM_getValue
// @grant       GM_setValue
// @grant       unsafeWindow
// @match       https://*.die-staemme.de/game.php?*screen=am_farm*
// @include     https://*.die-staemme.de/game.php?*screen=am_farm*
// @include     https://*.die-staemme.de/game.php?*screen=place*
// @copyright   2017+, the stabel, old author: Raznarek
// ==/UserScript==

var $ = typeof unsafeWindow != 'undefined' ? unsafeWindow.$ : window.$;
var _version = "0.2.2";
var _Anleitungslink = "http://blog.ds-kalation.de/";
var _UpdateLink = "https://github.com/st4bel/DS_Farmhelper/releases";

var _config = {"running":"false","debug":"false","units":"no_archer","walk_dir":"right","max_farmpage":10,"max_distance":30,"max_last_visit":12,"max_wall":0,"nextline":200,"nextline_fast":25,"nextvillage":1000,"group_empty":10,
"primary_button":"c","lastvisit_button":"a","notenoughtroops_button":"a","double_attack":"false","max_secondary":20,"begleitschutz":"axe=100"};
_config.version = _version;
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
  //storageSet("config",JSON.stringify(_config));
  storageSet("sec_counter",storageGet("sec_counter",0));
  storageSet("templates",storageGet("templates","{}"));
  storageSet("wall_atts",storageGet("wall_atts","{}"));
  update_config();
  var autoRun = JSON.parse(storageGet("config")).running==="true";
  add_log("init_UI...");
  init_UI();
  if(autoRun){
      if(getPageAttribute("screen")=="am_farm"){
          onFarm();
      }else if(getPageAttribute("screen")=="place"&&getPageAttribute("try")=="confirm"){
        onConfirm();
      }else if(getPageAttribute("screen")=="place"&&getPageAttribute("farm")=="1"){
        onPlace();
      }else if(getPageAttribute("screen")=="place"){
        closePlace();
      }
  }
  function onFarm(){
    add_log("onFarm...");
    var rows = $("div.body > table tr").slice(1);
    var current = -1;
    var config = JSON.parse(storageGet("config"));
    var secondary_counter=storageGet("sec_counter");
    (function tick(){
      config = JSON.parse(storageGet("config"));
      if(config.running==="false") {
        add_log("Stopped");
        return;
      }
      current++;
      add_log("tick #"+current);
      if(current >= rows.length-1){
        storageSet("sec_counter",secondary_counter);
        nextPage();
      }
      if(secondary_counter>config.max_secondary){
        nextvillage();
      }
      var row = rows[current];
      var distance = parseInt($("td",row).eq(7).text());
      var wall = $("td",row).eq(6).text()!="?" ? parseInt($("td",row).eq(6).text()) : 0;
      if(wall>config.max_wall){
        destroyWall(row,wall);
      }
      var last_visit = getLastVisit(row);
      if(distance<=config.max_distance||config.max_distance==-1){
        add_log("distance ok!");
        if(last_visit+config.max_last_visit*1000*3600>Date.now()||config.last_visit==-1){
          add_log("last_visit ok!");
          if(!isAttacked(row)){
            add_log("not attacked!");
            if(unitCheck(config.primary_button)&&canPress(row,config.primary_button)){
              add_log("prim!");
              press(row,config.primary_button,"green");
              secondary_counter=0;
              setTimeout(function(){
                tick();
              },percentage_randomInterval(config.nextline,5));
            }else if(unitCheck(config.notenoughtroops_button)&&canPress(row,config.notenoughtroops_button)){
              add_log("notenough after prim!");
              press(row,config.notenoughtroops_button,"blue");
              secondary_counter++;
              setTimeout(function(){
                tick();
              },percentage_randomInterval(config.nextline,5));
            }else{
              setTimeout(function(){
                add_alert("next village / keine truppen");
                nextvillage();
              },percentage_randomInterval(config.nextvillage,5));
            }
          }else if(config.double_attack!=="false"){
            add_log("attacked, doubleattack not false!");
            if(unitCheck(config.double_attack)&&canPress(row,config.double_attack)){
              add_log("double_attack!")
              press(row,config.double_attack,"lime");
              secondary_counter=0;
              setTimeout(function(){
                tick();
              },percentage_randomInterval(config.nextline,5));
            }else if(unitCheck(config.notenoughtroops_button)&&canPress(row,config.notenoughtroops_button)){
              add_log("notenough, after double!");
              press(row,config.notenoughtroops_button,"blue");
              secondary_counter++;
              setTimeout(function(){
                tick();
              },percentage_randomInterval(config.nextline,5));
            }else{
              add_log("nothing, after double!")
              if(config.notenoughtroops_button=="nextvillage"){
                nextvillage();
              }
              secondary_counter++;
              setTimeout(function(){
                $("td",row).css("background-color","red");
                tick();
              },percentage_randomInterval(config.nextline_fast,5));
            }
          }else{
            add_log("no double..");
            setTimeout(function(){
              $("td",row).css("background-color","red");
              tick();
            },percentage_randomInterval(config.nextline_fast,5));
          }
        }else if(unitCheck(config.lastvisit_button)){
          add_log("last_visit not ok!")
          press(row,config.lastvisit_button,"orange");
          secondary_counter++;
          setTimeout(function(){
            tick();
          },percentage_randomInterval(config.nextline,5));
        }else{
          add_log("last_visit not ok, no troops")
          setTimeout(function(){
            $("td",row).css("background-color","red");
            tick();
          },percentage_randomInterval(config.nextline,5));
        }
      }else{
        add_log("too far.")
        setTimeout(function(){
          add_alert("next village / zu weit");
          nextvillage();
        },percentage_randomInterval(config.nextvillage,5));
      }
    })();
  }
  function closePlace(){
    add_log("checking, if window has to be closed..")
    var wall_atts=JSON.parse(storageGet("wall_atts"));
    var con = "";
    for(var id in wall_atts){
      if(id==getPageAttribute("village")){
        con=id;
      }
    }
    if(con!=""){
      delete wall_atts[con];
      add_log("closing window")
      window.close();
    }
  }
  function onPlace(){
    add_log("trying to send att...")
    var wall_atts = JSON.parse(storageGet("wall_atts"));
    wall_atts[getPageAttribute("target")]=Date.now();
    wall_atts[getPageAttribute("village")]=Date.now();
    storageSet("wall_atts",JSON.stringify(wall_atts));
    setTimeout(function(){
      add_log("sending...");
      $("#target_attack").click();
    },percentage_randomInterval(JSON.parse(storageGet("config")).nextvillage,5));
  }
  function onConfirm(){
    add_log("confirming...");
    setTimeout(function(){
      add_log("confirmed");
      $("#troop_confirm_go").click();
    },percentage_randomInterval(JSON.parse(storageGet("config")).nextvillage,5));
  }
  function destroyWall(row,x){
    var config = JSON.parse(storageGet("config"));
    var link = $("a",$("td",row).eq(11)).attr("href");
    var target = link.substring(link.indexOf("target=")+7,link.indexOf("&",link.indexOf("target=")+7));
    var wall_atts = JSON.parse(storageGet("wall_atts"));
    for(var id in wall_atts){
      if(target==id&& (wall_atts[id] + 8.64*Math.pow(10,7))> Date.now() ){
        return;
      }
    }
    var a = -3.066;var b = 3.832; var c = -0.181;var d = 0.0284;
    var ramms = Math.ceil(a+b*x+c*Math.pow(x,2)+d*Math.pow(x,3))+1;
    window.open(link+config.begleitschutz+"&ram="+ramms+"&farm=1",'_blank');
    return;
  }
  function unitCheck(button){
    //returns true false
    add_log("checking for available units...");
    config = JSON.parse(storageGet("config"));
    if(button=="c"){
      return sumCheckedUnits(getUnitInfo())>0;
    }else if(button=="a"||button=="b"){
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
  //wechselt zur naechsten farmseite, oder wenn noetig, zum naechsten dorf
  function nextPage() {
      var current = parseInt(getPageAttribute("Farm_page"));
      var total = parseInt($("a.paged-nav-item").last().text().replace(/ \[|\] /g,""));

      if(JSON.parse(storageGet("config")).max_farmpage != 0) {
          total = Math.min(JSON.parse(storageGet("config")).max_farmpage , total);
      }
      var nextVillage=false;
      current++;
      if(current>=total-1) {
        current=0;
        nextvillage();
      }else{
        location.href="/game.php?Farm_page="+current+"&screen=am_farm";
      }
  }
  function nextvillage(){
    storageSet("sec_counter",0);
    if($(".arrowRightGrey").length!=0&&$(".jump_link").length!=0){
      var link = $("#village_switch_"+JSON.parse(storageGet("config")).walk_dir).attr("href").replace(/(\&Farm\_page\=[0-9]+)/g,"&Farm_page=0");
      location.href=link;
    }else{
      $("#content_value").prepend($("<div>").attr("class","error_box").text("Farmscript Reborn in Warteschleife, da die Gruppe leer ist. "+(new Date())));
      setTimeout(function(){
        nextvillage();
      },percentage_randomInterval(JSON.parse(storageGet("config")).group_empty*1000*60,5));
    }
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
          "height":"700px",
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

      var input_group_empty = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).group_empty)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.group_empty = parseInt($(this).val());
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
      var input_begleitschutz = $("<input>")
      .attr("type","text")
      .val(JSON.parse(storageGet("config")).begleitschutz)
      .on("input",function(){
        var config = JSON.parse(storageGet("config"));
        config.begleitschutz = $(this).val();
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

      var select_notenoughtroops = $("<select>")
      .append($("<option>").text("Keine").attr("value","false"))
      .append($("<option>").text("A").attr("value","a"))
      .append($("<option>").text("B").attr("value","b"))
      .append($("<option>").text("C").attr("value","c"))
      .append($("<option>").text("nächstes Dorf").attr("value","nextvillage"))
      .change(function(){
        var config = JSON.parse(storageGet("config"));
        config.notenoughtroops_button = $("option:selected",$(this)).val();
        storageSet("config",JSON.stringify(config));
      });
      $("option[value="+JSON.parse(storageGet("config")).notenoughtroops_button+"]",select_notenoughtroops).prop("selected",true);

      var select_lastvisit_button = $("<select>")
      .append($("<option>").text("Keine").attr("value","false"))
      .append($("<option>").text("A").attr("value","a"))
      .append($("<option>").text("B").attr("value","b"))
      .append($("<option>").text("C").attr("value","c"))
      .change(function(){
        var config = JSON.parse(storageGet("config"));
        config.lastvisit_button = $("option:selected",$(this)).val();
        storageSet("config",JSON.stringify(config));
      });
      $("option[value="+JSON.parse(storageGet("config")).lastvisit_button+"]",select_lastvisit_button).prop("selected",true);

      var select_doubleattack = $("<select>")
      .append($("<option>").text("Keine").attr("value","false"))
      .append($("<option>").text("A").attr("value","a"))
      .append($("<option>").text("B").attr("value","b"))
      .append($("<option>").text("C").attr("value","c"))
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
        console.log(storageGet("config"));
      });
      $("option[value="+JSON.parse(storageGet("config")).debug+"]",select_debug).prop("selected",true);

      var button_create_template = $("<button>")
      .text("Erstellen")
      .click(function(){
        var templates = JSON.parse(storageGet("templates"));
        var config = JSON.parse(storageGet("config"));
        templates[input_template_name.val()]=config;
        templates[input_template_name.val()].running=false;
        storageSet("templates",JSON.stringify(templates));
        $("<option>").text(input_template_name.val()).attr("value",input_template_name.val()).appendTo(select_template);
      });
      var button_remove_template = $("<button>")
      .text("Löschen")
      .click(function(){
        var templates = JSON.parse(storageGet("templates"));
        if($("option:selected",select_template).val()!="false"){
          delete templates[$("option:selected",select_template).val()];
          storageSet("templates",JSON.stringify(templates));
          $("option:selected",select_template).remove();
          $("option[value=false]",select_debug).prop("selected",true);
        }else{
          alert("nicht löschbar..");
        }
      });
      var button_take_template = $("<button>")
      .text("Übernehmen")
      .click(function(){
        if($("option:selected",select_template).val()!="false"){
          var templates = JSON.parse(storageGet("templates"));
          config = templates[$("option:selected",select_template).val()];
          add_log(JSON.stringify(config));
          storageSet("config",JSON.stringify(config));
          location.reload();
        }else{
          alert("Bitte Vorlage zum Übernehmne Auswählen..");
        }
      });

      var input_template_name = $("<input>")
      .attr("type","text")
      .val("neuer Name");

      var select_template = $("<select>")
      .append($("<option>").text("-Auswählen-").attr("value","false"));

      var templates = JSON.parse(storageGet("templates"));
      for(var name in templates){
        $("<option>").text(name).attr("value",name).appendTo(select_template);
      }

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
      $("<span>").text("Pause, wenn kein Angriff geschickt wurde (rot, in ms): "),
      input_nextline_fast);
      addRow(
      $("<span>").text("Pause beim Dorfwechsel (in ms): "),
      input_nextvillage);
      addRow(
      $("<span>").text("Pause bei leerer Gruppe (in min): "),
      input_group_empty);
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
      $("<span>").text("primärer Angriffsbutton (grün): "),
      select_primary);
      addRow(
      $("<span>").text("Button, falls nicht genug Truppen für primären Angriff (blau): "),
      select_notenoughtroops);
      addRow(
      $("<span>").text("Button, falls letzter Besuch zu lange her (orange): "),
      select_lastvisit_button);
      addRow(
      $("<span>").text("Button, falls Dorf bereits angegriffen (hellgrün): "),
      select_doubleattack);
      addRow(
      $("<span>").text("'Spezialbuttons' nur x mal am Stück benutzen: "),
      input_max_secondary);
      $("<tr>").append($("<td>").attr("colspan",2).append($("<span>").attr("style","font-weight: bold;").text("Begleitschutz Wall zerstören:"))).appendTo(settingsTable);
      addRow(
      $("<span>").text("In der Form 'engl. Kurzname'=Anzahl Bsp: 'axe=100' oder 'axe=100&spy=1' .."),
      input_begleitschutz);

      $("<tr>").append($("<td>").attr("colspan",2).append($("<span>").attr("style","font-weight: bold;").text("Vorlage erstellen:"))).appendTo(settingsTable);
      addRow(
      $("<span>").text("Name der neuen Vorlage: "),
      input_template_name);
      addRow(
      $("<span>").text(""),
      button_create_template);
      $("<tr>").append($("<td>").attr("colspan",2).append($("<span>").attr("style","font-weight: bold;").text("Vorlagen verwalten:"))).appendTo(settingsTable);
      addRow(
      $("<span>").text("Vorlage Auswählen: "),
      select_template);
      addRow(
      $("<span>").text("Vorlage benutzen: "),
      button_take_template);
      addRow(
      $("<span>").text(""),
      button_remove_template);
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

      //UI out of popup:

      $("<button>").text("Start/Stop").appendTo($("h2").eq(0))
      .click(function(){
        toggleRunning();
      });
  }
  function toggleRunning(){
      var config = JSON.parse(storageGet("config"));
      config.running = ""+(config.running==="false");
      add_log("running set to "+config.running);
      storageSet("config",JSON.stringify(config));
      if(config.running==="true"||config.debug==="false"){location.reload();}
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
  function update_config(){
    var config = JSON.parse(storageGet("config"));
    var pattern = /[0-9]+\.[0-9]+/;
    add_log("updating config from "+pattern.exec(config.version)+".x to "+pattern.exec(_version)+".x ...");
    if(pattern.exec(config.version)!=pattern.exec(_version)){ // nur Versionen bis zur 2. ebene beachten...
      for(var name in _config){
        if(config[name]===undefined){
          config[name]=_config[name];
          add_log("successfully added entry: "+name+"="+config[name]);
        }
      }
      for(var name in config){
        if(_config[name]===undefined){
          add_log("deleting entry: "+name+"="+config[name]);
          delete config[name];
          add_log("successfully deleted entry: "+name);
        }
      }
      config.version=_version;
      storageSet("config",JSON.stringify(config));
    }
  }
});
