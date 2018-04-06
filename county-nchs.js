/*~~ API reference ~~~~~~~~~~~~~~~~~~~~~~~~~

https://api.highcharts.com/highmaps/

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


/*~~~~~ Load external shapefiles and JCHS logo ~~~~~~*/
counties = Highcharts.geojson(Highcharts.maps["countries/us/us-all-all-highres"])
//counties = Highcharts.maps["countries/us/counties"]
states = Highcharts.geojson(Highcharts.maps["countries/us/us-all-all-highres"], 'mapline')
logoURL =
  "http://www.jchs.harvard.edu/sites/jchs.harvard.edu/files/harvard_jchs_logo_2017.png"


data_classes_netflow = [
  {to: -1000,
   color: "#560101"         
  },
  {from: -1000,
   to: -100,
   color: "#E3371E"
  },
  {
    from: -100,
    to: 0,
    color: "#FF8372" /*Option: gray these out: #F9F6F5 */
  },
  {
    from: 0,
    to: 100,
    color: "#F9F6F5" /*NOTE: the missing values (e.g. for non-urban counties) are considered zero, so if you change this coloration, it colors the whole map*/
  },
  {
    from: 100,
    to: 1000,
    color: "#ABBFC3"
  },
  {
    from: 1000,
    color: "#4E7686"
  }
]


var selected_year = $('#select_year').val()
var selected_county_type = $('#county_type')
var selected_flow = 'Netflows'
var selected_metro = ''
var selected_metro_name = ''
var flow_data = {}
var map_data = []

var baseURL = "https://sheets.googleapis.com/v4/spreadsheets/"
var API_Key = "AIzaSyDY_gHLV0A7liVYq64RxH7f7IYUKF15sOQ"
var API_params = "valueRenderOption=UNFORMATTED_VALUE"


/*~~~~~~ Document ready function ~~~~~~~~~~~~~~~~~*/
$(document).ready(function() {
  createMap()
  
  var SheetID = "1joBNc8UeeOqFKjmaCgNllemRZKN_UC8Nms-blkebVzI"
  var range = "Sheet1!A:N"

  var requestURL2 = baseURL 
  + SheetID 
  + "/values/" 
  + range 
  + "?key=" 
  + API_Key 
  + "&" 
  + API_params

  $.get(requestURL2, function(obj) {
    console.log(requestURL2)

    flow_data['Netflows'] = obj.values
    
  })
})


/*~~~~~~ Create the main map ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
function createMap() { 

  /*~~~~~~~~ Google Sheet API request ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
  //Change for specific source table
  //This is the data for the base map, the first thing that appears -RF
  //Put data here
  var SheetID = "1joBNc8UeeOqFKjmaCgNllemRZKN_UC8Nms-blkebVzI"
  var range = "Sheet1!A:N"

  var requestURL = baseURL 
    + SheetID 
    + "/values/" 
    + range 
    + "?key=" 
    + API_Key 
    + "&" 
    + API_params

  $.get(requestURL, function(obj) {
    console.log(requestURL)

    map_data = obj.values

    /*~~~~~~~~ Standard JCHS Highcharts options ~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    Highcharts.setOptions({
      credits: { enabled: false },
      lang: {
        thousandsSep: ",",
        contextButtonTitle: "Export Map",
        downloadPDF: "Download as PDF",
        downloadCSV: "Download chart data (CSV)",
        downloadXLS: "Download chart data (Excel)"
      },
      colors: ['#4E7686', '#c14d00', '#998b7d', '#43273a', '#e9c002', '#76ad99', '#c4c6a6'],
    }) //end standard options


    /*~~~~~~~~~~~ Highcharts Map ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
    map = Highcharts.mapChart("county_migration_map", {
      chart: {
        height: 600,
        width: 800,
        margin: [50, 30, 75, 10], //to allow space for title at top, legend at right, and notes at bottom
        borderWidth: 0,
        events: {
          load: function(event) {
            this.renderer
              .image(logoURL, 0, this.chartHeight - 80, 289, 85) //puts logo in lower left
              .add() // (src,x,y,width,height)
              
            getFlowData('Inflows', '2016')
            
          }
        }
      },

      mapNavigation: { enabled: true },

      subtitle: {
        //use subtitle element for our table notes
        text:
        "Notes: The IRS does not report any county pairings with fewer than ten migrants due to confidentiality concerns (net flows are caclulated by subtracting outflows from inflows, and may be affected by this exclusion for counties with very low migration flows). Each year shown is the second year of a year pairing (e.g. 2012 represents returns matched from 2011-2012). The 2015 data are excluded due to data quality issues that year. <br/>Source: JCHS tabulations of IRS, SOI Migration Data.",
        widthAdjust: -300,
        align: "left",
        x: 300,
        y: -50, //may have to change this, depending on lenght of notes
        verticalAlign: "bottom",
        style: {
          color: "#999999",
          fontSize: "9px"
        }
      },

      //main title of chart
      title: {
        text:
        'Net Flows, ' + selected_year,
        style: {
          color: "#C14D00",
          fontWeight: 600,
          fontSize: "18px"
        }
      },

      legend: { //Base netflow map legend
        title: {
          text: "Net flow of migrants<br />"
        },
        layout: "vertical",
        align: "right",
        verticalAlign: "middle",
        y: 110,
        x: 10,
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        labelFormatter: function() {
          if ((this.from != null) & (this.to != null)) { //legend entries w/ upper & lower bound
            return this.from + " to " + this.to
          } else if (this.to != null) { //lowest legend entry
            return "Lower than " + this.to
          } else if (this.from != null) { //highest legend entry
            return "More than " + this.from
          }
        }
      },

      //define value ranges for the data
      colorAxis: {
        dataClasses: data_classes_netflow
      },

      series: [
        {
          type: "map",
          name: 'county map',
          mapData: counties,
          borderWidth: 0.5, //Thinner than usual to help see small counties
          //allAreas: false,
          data: map_data,
          joinBy: ["fips", 0],
          keys: ["fips", "value"],
          allowPointSelect: true,
          nullInteraction: true,
          states: {
            select: { color: "#000" } //highlights selected county
          },
          point: {
            events: {
              click: function(event) {
                console.log("clicked on map: " + event.point.name)
                selected_metro = event.point.fips
                selected_metro_name = event.point.name
                focusMetro(event.point.fips, event.point.name)

              },
            } //end events
          } //end point
        },
        {
          type: "mapline",
          name: "State borders",
          data: states,
          color: "#333",
          lineWidth: 1, //Thinner than usual to help see small counties
          tooltip: { //make tooltip not show up for 'state borders'
            enabled: false
          }
        }
      ],

      tooltip: {
       formatter: function() {
          if (this.point.value != null) {
            return (
              "<b>" 
              + this.point.name
              + "</b><br/>"
              + 'Migrants'
              //+ this.series.name
              + ": "
              + this.point.value.toLocaleString() 
            )
          } else if (this.point.name != null) {
            return (
              '<b>' 
              + this.point.name
              + '</b>'
            )
          } else {
            return false
          }
        }
      },

      /*~~~~~~Exporting options~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
      exporting: {
        enabled: true,
        filename: "County-level Domestic Migration",
        menuItemDefinitions: {
          /*downloadFullData: {
            text: "Download full dataset (Excel)",
            onclick: function() {
              window.open("http://www.jchs.harvard.edu/")
              alert("See tab A-1 for data from this chart")
            }
          }*/
        },
        buttons: {
          contextButton: {
            text: "Export",
            menuItems: [
              "printChart",
              "downloadPDF",
              "separator",
              "downloadPNG",
              "downloadJPEG"
              //'separator',
              //'downloadFullData'
            ],
            theme: {
              fill: "#ffffff00"
            }
          }
        }
      } //end exporting
      
    }) //end map

  }) //end get request
  
} //end createMap()




/*~~~~ change data to focus on metro ~~~~~~~~~~~~~~~~~~~~~~~~*/
function focusMetro(GEOID, name) {

  console.log(GEOID + ' ' + name)
  
  var new_data = []

  //re-select selected county
  map.series[0].data.forEach(function(pt) {
    if (pt.options.fips == GEOID) {
      map.series[0].data[pt.index].select()
    }
  })

  //add button to clear the selection
  if (!$('#clear_button').length) {
    map.renderer.button('Clear selection',450,450)
      .attr({
      padding: 7,
      id: 'clear_button'
    })
      .add()

    $('#clear_button').click(function () { 
      netflowMap()
      selected_metro = ''
      selected_metro_name = ''
      $('#clear_button').remove()
    })
  }
  
}//end focusMetro()


$('#select_year').change(function () {
  selected_year = $('#select_year').val()

  if (selected_flow != 'Netflows') {
    var flow_load_result = getFlowData(selected_flow, selected_year)

    if (selected_metro !== '' & flow_load_result === 'data already loaded') {
      focusMetro(selected_metro, selected_metro_name)
    } 
  } else {
    netflowMap()
    getFlowData('Inflows', selected_year, false)
  }

})

$('#county_type').change(function () {
  var selected_county_type = $('#county_type').val()
  map.update[0].points[selected_county_type].select() 
})



function resetMap() {
  selected_metro = ''
  map.series[0].setData(map_data)
  map.update({title: {text: 'Net Flows, 2016'}})
  map.update({
    legend: {
      title: {
        text: 'Net flow of migrants'
      }
    },
    colorAxis: { 
      dataClasses: data_classes_netflow
    }
  })
}
