var a = {}
$(".units-entry-all").each(function(){
  unitname = $(this).attr("data-unit")
  amount = parseInt($(this).text().split("(")[1].split(")")[0])
  a[unitname] = amount
})
alert(JSON.stringify(a))

var style
$("div.portrait").each(function(){
  style = $(this).attr("style").split("graphic/scavenging/options/")[1].split(".png")[0]
  
})
style
if($(this).attr("style") == "Faule Sammler"){
  var status_div = $(this).next()
  a = $("a.free_send_button",status_div)
}