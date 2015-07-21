 /*----------------------Global Variables - Map-----------------------*/
  var categoryColors = {'Political/social unrest':'#66c2a5','conflict':'#fc8d62','disaster':'#8da0cb','food insecurity':'#e78ac3','disease':'#a6d854','water insecurity':'#ffd92f', 'population displacement': '#e5c494', '':'none'}
      
  var width = $('#map').width();
  var map_height = 480;

  var projection = d3.geo.mercator()
      .center([0, 0])
      .scale(180);

  var svg = d3.select("#map").append("svg")
      .attr("width", width)
      .attr("height", map_height);

  var path = d3.geo.path()
      .projection(projection);

  var g = svg.append("g");

  g.append("rect")
    .attr('x', projection([ -146,7.5])[0])
    .attr('y', projection([-146,7.5])[1])
    .attr('rx', 5)
    .attr('ry', 5)
    .attr('width', 60)
    .attr('height', 240)
    .style('stroke', '#6f6f6f')
    .style('stroke-width', '1px')
    .style('fill', 'none');
      
  g.append('text')
    .attr('x', projection([ -149.9,9])[0])
    .attr('y', projection([-149.9,9])[1])
    .text('Across Regions')
    .style('font-size', '12px')
    .style('fill', '#6f6f6f');

  var tip = d3.tip()
      .attr('class', 'd3-tip')
      .html(function(d){
            return "<b>"+ d.values[0].country + "</b><br>" + d.values.length + ' stories';
        });
  svg.call(tip);
  
  //zoom and pan
  var zoom = d3.behavior.zoom()
      .on("zoom",function() {
          g.attr("transform","translate("+ 
              d3.event.translate.join(",")+")scale("+d3.event.scale+")");
          g.selectAll("circle")
              .attr("d", path.projection(projection));
          g.selectAll("path")  
              .attr("d", path.projection(projection)); 
  });     
  svg.call(zoom);
  
  /*----------------------Global Variables - Trend Chart-----------------------*/
  //defining the size for the graph
  var margin_trend = {top: 30, right: 50, bottom: 30, left: 50};
  var width_trend = width - margin_trend.left - margin_trend.right;
  var height_trend = 150 - margin_trend.top - margin_trend.bottom;
  var minStartDate;
  var maxStartDate;
  var barWidth;
  var x;
  var xAxis;
  var brush;
  //defining a function which gets a string and parse it into a real date type
  var parseDate = d3.time.format("%w/%U/%Y").parse;
  var parseExactDate = d3.time.format("%m/%d/%Y").parse;
  var svg_trend = d3.select("#trend").append("svg")
      .attr("width", width_trend + margin_trend.left + margin_trend.right)
      .attr("height", height_trend + margin_trend.top + margin_trend.bottom) 
  
  /*----------------------Load data and call draw_all()-----------------------*/ 
  var map_data;
  var filtered_data;
  var bars_padding = 3;
  var doc; //report placeholder
  var active_circles = [];

  // load and display the World
  d3.json("static/data/world-110m2.json", function(error, topology) {
      g.selectAll("path")
          .data(topojson.object(topology, topology.objects.countries)
              .geometries)
          .enter()
          .append("path")
          .attr("d", path)
          .attr("class", "map")
    });

  // load the data once and draw the map and the trend chart
  d3.csv("static/data/news_stories_final.csv", function(error, data) {
      map_data = data
          .sort(function(a, b){
              var date1 = new Date(a.date),
              date2 = new Date(b.date);
              if (date1<date2){
                  return 1;
              }
              if (date2<date1){
                  return -1;
              }
              return 0;
          });

      minStartDate = parseExactDate(d3.min(map_data,function(d){return d.date;}));
      maxStartDate = parseExactDate(d3.max(map_data,function(d){return d.date;}));
      minStartWeek = parseDate(d3.min(map_data,function(d){return d.week_year;}));
      maxStartWeek = parseDate(d3.max(map_data,function(d){return d.week_year;}));

      var oneWeek = 24*60*60*1000*7; 
      var numberOfBars = Math.ceil((maxStartWeek-minStartWeek)/oneWeek);
      barWidth = width_trend/(numberOfBars);
      barWidth = barWidth - bars_padding;
      maxStartWeek = d3.time.week.offset(maxStartWeek,1);
      x = d3.time.scale()
          .domain([d3.time.week.offset(minStartWeek,-1), maxStartWeek])
          .rangeRound([0, width_trend]);
      xAxis = d3.svg.axis()
          .scale(x)
          .orient("bottom")
          .ticks(d3.time.weeks, 4)
          .tickFormat(d3.time.format('%b %Y'));
      draw_all();
      populate_on_load();
  });

  d3.selectAll(".filter-button").on("click", function() {
      var currButton = d3.select(this);
      if (currButton.attr('checked')){
          currButton.attr('checked',null);
          currButton.style('opacity',0.3);
      }
      else{
          currButton.attr('checked','1');
          currButton.style('opacity',null);
      }
      draw_all();
  });

  var rscale = null;

  /*----------------------Draw Circles - Map-----------------------*/
  function draw_circles(filtered_data){
       //group the data by lat/lon
      nested_data = d3.nest()
          .key(function(d) { return (d.lng+","+d.lat);})
          .sortKeys(d3.ascending)
          .entries(filtered_data);
      //calculate max values for rscale    
      var max_number_stories;
      if (rscale==null){
          max_number_stories = d3.max(nested_data,function(d){
              return d.values.length;
          });
          rscale = d3.scale.log()
          .domain([1,max_number_stories])
          .range([2,15]);
      }
      //remove all current circles 
      g.selectAll("circle").remove();

      //draw new circle
      g.selectAll("circle")
        .data(nested_data)
        .enter()
        .append("circle")
        .attr("cx", function(d) {
            return projection([d.values[0].lng, d.values[0].lat])[0];
        })
        .attr("cy", function(d) {
            return projection([d.values[0].lng, d.values[0].lat])[1];
        })
        .attr("r", function(d) {
            return rscale(d.values.length);
        })
        .attr("country", function(d) {
            return d.values[0].country;
        })
        .attr('class', 'circle_unselected')
        .style('cursor', 'pointer')
        .on("click", select_circle)
        .on('mouseover', tip.show)
        .on('mouseout', tip.hide)
  }

  function select_circle(d){
      // change circles styles

      if (d3.select(this).attr('class') == 'circle_unselected'){
        d3.select(this).attr('class', 'circle_selected');
        var thisCountry = d3.select(this).attr('country');
        if (active_circles.indexOf(thisCountry) == -1) {
          active_circles.push(thisCountry);
        }
      } else {
        d3.select(this).attr('class', 'circle_unselected')
        var index = active_circles.indexOf(d3.select(this).attr('country'));
        if (index > -1) {
          active_circles.splice(index, 1);
        }
      }
      //d3.selectAll('circle').attr('class', 'circle_unselected')
      
      //clear story text and title
      d3.select("#story_text").html("");
      d3.select("#story_titles").html("");
      d3.select("#story_link").html("");
      d3.select("#story_filtered").html("");

      //select current circle
      d3.selectAll('circle')

          .each(function(e) {

            if (d3.select(this).attr('class') == 'circle_selected'){


              

              //initialize report
              doc = new jsPDF('p','in','letter');
              doc.setFontSize(12);
              doc.setFont("times")
              verticalOffset = 0.5;
              var counter = 1;

              //iterate over all stories in circle
              e.values.forEach(function(v) {
                  var tags_svg = d3.select('#story_titles').append("p")
                      .datum(v)
                      .on('click', select_headline)
                      .html(v.story_title + "<br />" + "Date: " + v.date)
                      .append('svg')
                      .attr('width',300)
                      .attr('height',15);
                  tags_svg.append('rect')
                      .attr('x',0)
                      .attr('y',5)
                      .attr('width',25)
                      .attr('height',15)
                      .attr('fill',categoryColors[v.category]);
                  tags_svg.append('rect')
                      .attr('x',30)
                      .attr('y',5)
                      .attr('width',25)
                      .attr('height',15)
                      .attr('fill',categoryColors[v.category2]);
                  tags_svg.append('rect')
                      .attr('x',60)
                      .attr('y',5)
                      .attr('width',25)
                      .attr('height',15)
                      .attr('fill',categoryColors[v.category3]);

                  var full_stories = d3.select('#story_filtered').append("p")
                      .datum(v)
                      .html(
                        "<b>"+v.story_title+"</b> "+v.date
                        +"<br><i>"+v.country+", "+v.region+"</i>"
                        +"<br>"+v.story
                        +"<br><i>"+v.link+"</i>"
                      )
                      .append('svg')
                      .attr('width',300)
                      .attr('height',15);;
                  full_stories.append('rect')
                      .attr('x',0)
                      .attr('y',5)
                      .attr('width',25)
                      .attr('height',15)
                      .attr('fill',categoryColors[v.category]);
                  full_stories.append('rect')
                      .attr('x',30)
                      .attr('y',5)
                      .attr('width',25)
                      .attr('height',15)
                      .attr('fill',categoryColors[v.category2]);
                  full_stories.append('rect')
                      .attr('x',60)
                      .attr('y',5)
                      .attr('width',25)
                      .attr('height',15)
                      .attr('fill',categoryColors[v.category3]);

                  //prepare report

                  if ((counter == 6) || (verticalOffset > 8)){
                    doc.addPage();
                    verticalOffset = 0.5;
                  }

                  
                  //title
                  lines = doc.setFontType("bold")
                    .setFontSize(12)
                    .splitTextToSize(v.story_title, 7.5);
                  doc.text(0.5, verticalOffset + 12 / 72, lines);
                  verticalOffset += (lines.length + 0.5) * 12 / 72;

                  //country, region
                  lines = doc.setFontType("italic")
                    .splitTextToSize(v.date+" - "+v.country+", "+v.region, 7.5);
                  doc.text(0.5, verticalOffset + 12 / 72, lines);
                  verticalOffset += (lines.length + 0.5) * 12 / 72;


                  //story
                  lines = doc.setFontType("normal")
                    .splitTextToSize(v.story, 7.5);
                  doc.text(0.5, verticalOffset + 12 / 72, lines);
                  verticalOffset += (lines.length + 0.5) * 12 / 72;
                  
                  //source
                  lines = doc.setFontType("italic")
                    .setFontSize(10)
                    .splitTextToSize(v.link, 7.5);
                  doc.text(0.5, verticalOffset + 12 / 72, lines);
                  verticalOffset += (lines.length + 0.5) * 12 / 72;

                  //new line
                  lines = doc.setFontType("italic")
                    .setFontSize(14)
                    .splitTextToSize(" ", 7.5);
                  doc.text(0.5, verticalOffset + 12 / 72, lines);
                  verticalOffset += (lines.length + 0.5) * 12 / 72;

                  counter +=1;

              });

            }

            //display country name
            if (active_circles.length > 1){
              d3.select("#c_name").html("Multiple Countries");
            } else {
              d3.select("#c_name").html(active_circles[0]);
            }
            

            
              
          });

  console.log(active_circles)
  }


  function select_headline(d){
      d3.selectAll('p').attr('class', 'story');
      d3.select(this).attr('class', 'story_selected');
      d3.select('#story_text')
          .html(d.story);
      d3.select('#story_link')
          .html("<a href=\""+d.story_link.match(/http.*/)[0]+"\"target=\"_blank\">"+ d.story_link.match(/.*(?=- http)/)+"</a>");
    }

  function draw_all(){
      //filter by categories buttons
      var checkedValues = $('.filter-button[checked]').map(function() {
          return this.name;
      }).get(); 
      filtered_data = map_data.filter(function(s){
          //a story can have up to three categories, this looks in each of the category columns
          return ($.inArray(s.category, checkedValues) > -1 
              || $.inArray(s.category2, checkedValues) > -1 
              || $.inArray(s.category3, checkedValues) > -1)
      });
      //filter by search
      var search = $('#search').val();
      if (search!=""){
          var stories_ids = entities_mapping[search];
          filtered_data  = filtered_data.filter(function(s){
              return $.inArray(s.story_id, stories_ids) > -1
          });
      }
      //clear out text in sidebar boxes
      d3.select("#story_text").html("");
      d3.select("#story_titles").html("");
      d3.select("#story_link").html("");
      d3.select("#story_filtered").html("");

      //removing the current SVG of the trend graph
      d3.select("#trend").select("#trendg").remove();
      //creating a new SVG in the proper size
      var svg_trend_g = svg_trend.append("g")
          .attr("id", "trendg")
          .attr("transform", "translate(" + margin_trend.left + "," + margin_trend.top + ")");
      //grouping the stories by week_year AND by category
      var stories_by_date = d3.nest()
          .key(function(d) { return (d.week_year);})
          .key(function(d) { return (d.category);})
          .rollup(function(d) { 
              return d3.sum(d, function(g) {return 1; });
          })
          .entries(filtered_data);
      //building an object for the drawing of the stacked bar chart
      var stories_aggregated = stories_by_date.map(function(d){
          var res = {'key':parseDate(d.key)}
          var arr = [];
          var i =-1;
          var y0 = 0;
          for (var key in categoryColors) {
              i+=1;
              arr[i] = {'category':key};
              var val = 0;
              d.values.forEach(function(h){
                  if(h.key==key){
                      val =  h.values
                  }
              });      
              if (i>0){
                  y0 = arr[i-1]['y1'];
                  }
                  arr[i]['y0']=y0;
                  arr[i]['y1']=y0+val;
          }
          res['total'] = arr[arr.length - 1].y1;
          res['values'] = arr;
          return res;
      });
      //sorting the data according to the key, i.e. week_year
      stories_aggregated.sort(function(a, b){
          if (a.key<b.key){
              return -1;
          }
          if (b.key<a.key){
              return 1;
          }
          return 0;
      });     
      //drawing the stacked bar chart      
      var y = d3.scale.linear()
          .rangeRound([height_trend, 0]);       
      var yAxis = d3.svg.axis()
          .scale(y)
          .ticks(4)
          .orient("left");
      y.domain([0, d3.max(stories_aggregated, function(d) { return d.total; })]);
      svg_trend_g.append("g")
          .attr("class", "x axis")
          .attr("transform", "translate("+barWidth/2 +"," + height_trend + ")")
          .call(xAxis);
      svg_trend_g.append("g")
          .attr("class", "y axis")
          .call(yAxis)
          .append("text")
          .attr("transform", "rotate(-90)")
          .attr("y", 0-margin_trend.left)
          .attr("dy", ".71em")
          .style("text-anchor", "end")
          .text("# Stories");
      var week = svg_trend_g.selectAll(".week")
          .data(stories_aggregated)
          .enter()
          .append("g")
          .attr("class", "g")
          .attr("transform", function(d) { return "translate(" + x(d.key) + ",0)"; });
      week.selectAll("rect")
          .data(function(d) { return d.values; })
          .enter()
          .append("rect")
          .attr("width", barWidth)
          .attr("y", function(d) { return y(d.y1); })
          .attr("height", function(d) { return y(d.y0) - y(d.y1); })
          .style("fill", function(d) { return categoryColors[d.category]; });
      draw_brush(svg_trend_g)
  }

  /*--------------------------------Populate on Load---------------------*/ 
  function populate_on_load(){
      $("circle").d3Click()
      
      d3.selectAll('circle')
        .each(function(e) {
          var thisCountry = d3.select(this).attr('country');
          if (active_circles.indexOf(thisCountry) == -1) {
            active_circles.push(thisCountry);
          }
        })
  }

  /*--------------------------------Populate after brushing ---------------------*/ 
  function populate(){
      d3.selectAll('circle')
          .each(function(e) {
            for (var i=0 ; i<active_circles.length ; i++){
              if (d3.select(this).attr('country') == active_circles[i]){
                $("circle[country='"+active_circles[i]+"']").d3Click()
              }
            }
          })
  };

  /*--------------------------------Brush--------------------------------*/  
  function draw_brush(svg){
      brush = d3.svg.brush()
          .x(x)
          .extent([d3.time.day.offset(maxStartDate,-1), maxStartDate])
          .on("brushstart", brushstart)
          .on("brush", brushmove)
          .on("brushend", brushend);
      var arc = d3.svg.arc()
          .outerRadius(height_trend / 2)
          .startAngle(0)
          .endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });
      var brushg = svg.append('g')
          .attr('class', 'brush')
          .call(brush);
      brushg.selectAll(".resize").append("path")
          .attr("transform", "translate(0," +  height_trend / 2 + ")")
          .attr("d", arc)
          .style("opacity", "0.4");
      brushg.selectAll("rect")
          .attr("height", height_trend);
      // initializing css styling for brush and line segments
      brushstart();
      brushmove();
      function brushstart() {
          svg.classed("selecting", true);
      }
      function brushmove() {
          var s = brush.extent();
          var parsedSelectedDate;
          var filtered_data_date = filtered_data.filter(function(d){
              //commented to enable exact days news filtering feature
              parsedSelectedDate = parseExactDate(d.date);
              var include_point = parsedSelectedDate >= s[0] && parsedSelectedDate <= s[1];
              return include_point;
          });
          //clear out text in sidebar boxes
          d3.select("#story_text").html("");
          d3.select("#story_titles").html("");
          d3.select("#story_link").html("");
          d3.select("#story_filtered").html("");
          draw_circles(filtered_data_date);

          
          //display date below the brush
          var displayDate = d3.time.format("%a, %B %e %Y");  
          var startDate = s[0];
          var endDate = s[1];
          d3.select("#date_display_start").text(displayDate(startDate));
          d3.select("#date_display_end").text(displayDate(endDate));

          active_circles = [];

          //populate the news
          //console.log(active_circles)
          
      }
      function brushend() {
            svg.classed("selecting", !d3.event.target.empty());
            //populate_on_load();
      }
  } 

  /*--------------------------------Generate report--------------------------------*/
  function generate_report(){
    doc.save("OPSCEN News Brief Report.pdf")
  }
  
  /*--------------------------------Search Bar--------------------------------*/

  var entities_mapping = {};
  d3.csv("static/data/entities.txt", function(error, data) {
      var entities_nest = d3.nest()
          .key(function(d){return d.entity;})
          .sortKeys(d3.ascending)
          .entries(data);
      var entities = entities_nest.map(function(d){
              return d.key;
      });
      $(function() {
            $("#search").autocomplete({
                source: entities
            });
      });
      entities_nest.forEach(function(d){
          entities_mapping[d.key] = d.values.map(function(d){
              return d.story_id;
          });
      });
  });

  d3.select("#search").on("search", function() {
      draw_all();
  });
  
  /*-----------------------------Facilitate trigger click events for d3 elements---------*/
  jQuery.fn.d3Click = function () {
      this.each(function (i, e) {
          var evt = document.createEvent("MouseEvents");
          evt.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
          e.dispatchEvent(evt);
      });
  };
