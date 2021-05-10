var margin = {top: 40, right: 10, bottom: 40, left: 10};

var aln_data = [
          {c1_nm: "Chr 1", c1_st: 0, c1_en: 100, c2_nm: "Chr 2", c2_st: 20, c2_en: 120, id: 90, strand: "+"},
          {c1_nm: "Chr 1", c1_st: 100, c1_en: 300, c2_nm: "Chr 2", c2_st: 120, c2_en: 320, id: 50, strand: "-"},
          {c1_nm: "Chr 1", c1_st: 300, c1_en: 400, c2_nm: "Chr 2", c2_st: 320, c2_en: 420, id: 20, strand: "+"},
          {c1_nm: "Chr 1", c1_st: 400, c1_en: 450, c2_nm: "Chr 2", c2_st: 0, c2_en: 50, id: 100, strand: "-"},
      ];

// load dataset and create table
function load_dataset(csv) {
    var data = d3.tsvParse(csv)
    console.log(data[0]);
    create_table(data);
}

function create_table(data) {
    var data2 = data.map(function(d){
        return {
            c1_nm: "Target: " + d["#reference_name"],
            c1_st: +d.reference_start,
            c1_en: +d.reference_end,
            strand: d.strand,
            c2_nm: "Query: "+ d["query_name"],
            c2_st: +d.query_start,
            c2_en: +d.query_end,
            id: +d.perID_by_events,
        };
    });
    console.log(data2);
    var svg = d3.select("#chart");
    svg.selectAll("*").remove();
    miropeats_d3(data2);
};

// handle upload button
function upload_button(el, callback) {
    var uploader = document.getElementById(el);  
    var reader = new FileReader();
  
    reader.onload = function(e) {
      var contents = e.target.result;
      callback(contents);
    };
  
    uploader.addEventListener("change", handleFiles, false);  
  
    function handleFiles() {
      d3.select("#table").text("loading...");
      var file = this.files[0];
      reader.readAsText(file);
    };
};


function miropeats_d3(aln_data){

    //var ct_names = d3.set(aln_data, function(d){return d.c2_nm;});
    var t_names = [...new Set(aln_data.map(d => d.c1_nm))];
    var q_names = [...new Set(aln_data.map(d => d.c2_nm))];
    var ct_names = q_names.reverse().concat(t_names);
    console.log(ct_names);

    //
    var height=100 * (ct_names.length);//*d3.set(ct_names).size();
    var width=800;
    var container = d3.select("#chart")
        .append("svg")
        .attr("width", "100%")
        //.attr("height", "100%")
        .attr("viewBox", `0 0 ${width} ${height}`) // top, left, width, down
    
    // xscale inital x scale
    const xscale = d3.scaleLinear()
            .domain([d3.min(aln_data, function(d) { return d3.min([d.c1_st,d.c2_st]) }),
                    d3.max(aln_data, function(d) { return d3.max([d.c1_en,d.c2_en]) })])
            .range([margin.left, width - margin.right])
    
    var xz = xscale;
    // yscale
    var yscale_d = d3.scaleBand()
            .domain(ct_names)
            .range([height - margin.bottom, margin.top])
            .paddingInner(1)
            .align(0);
    
    // opacity scale
    var alpha_scale = d3.scaleLinear()
            .domain([d3.min(aln_data, function(d) { return d.id }),
                     d3.max(aln_data, function(d) { return d.id })])
            .range([0.15, 0.6]);


    // zoom scale 
    const zoom = d3.zoom()
        .scaleExtent([1, 32])
        .extent([[margin.left, 0], [width - margin.right, height]])
        .translateExtent([[margin.left, -Infinity], [width - margin.right, Infinity]])
        .on("zoom", zoomed);

    // Define the div for the tooltip
    var div = d3.select("body").append("div")	
            .style("opacity", 0)
            .attr("class", "tooltip")
            .style("background-color", "white")
            .style("border", "solid")
            .style("border-width", "2px")
            .style("border-radius", "5px")
            .style("padding", "5px")    
            


    // my draw the bezier curves and fill
    function help_draw_alignment(c1_nm, o_c1_st, o_c1_en, c2_nm,
         o_c2_st, o_c2_en,
         perid, strand) {
        console.log("inner xz: "+xz(100));

        var c1_st = xz(o_c1_st), c1_en = xz(o_c1_en),
        c2_st = xz(o_c2_st), c2_en = xz(o_c2_en);
        
        const path = d3.path(),
        c1_h = yscale_d(c1_nm) + 5,//+yscale_d.bandwidth(),
        c2_h = yscale_d(c2_nm) - 5, //yscale_d(c2_nm),
        mid = (c1_h + c2_h) / 2; //yscale((c1_h+c2_h)/2);
        
        // forward color
        var color = "#af0404" // red
        if( strand == "-"){
            var tmp = c2_st;
            c2_st = c2_en;
            c2_en = tmp;
            var color = "#3282b8";
        };
        // color alpha on identity 
        console.log(perid);
        var opacity = alpha_scale(perid);
        console.log(opacity);

        // connect c1 start and end
        path.moveTo(c1_st, c1_h);
        path.lineTo(c1_en, c1_h);
        // connect the ends ends
        path.bezierCurveTo(c1_en, mid, c2_en, mid, c2_en, c2_h);
        // at contig 2 end go to c2 start 
        path.lineTo(c2_st, c2_h);
        // make a bezier the goes from c2_st to c1_st 
        path.bezierCurveTo(c2_st, mid, c1_st, mid, c1_st, c1_h);
        // path.bezierCurveTo(cpx1, cpy1, cpx2, cpy2, x1, y1);
        path.closePath();

        // make the highlight regions 
        container.append("path")
            .attr("d", path)
            .attr("stroke", "none")
            .attr("fill", color)
            .attr('opacity', `${opacity}`)
            .on('mouseover', function (event) {
                d3.select(this).transition()
                        .duration(100)
                        .attr('opacity', '.8');
            })
            .on('mousemove', function(event){
                // add the tooltip
                div.transition()		
                    .duration(100)		
                    .style("opacity", .9);		
                div.html(d3.format(".2f")(perid)+"%")	
                    .style("left", event.pageX + 20 + "px")		
                    .style("top", event.pageY + "px");
            })
            .on('mouseout', function () {
                d3.select(this).transition()
                        .duration(1)
                        .attr('opacity', `${opacity}`);
                // remove tooltip
                div.transition()		
                    .duration(200)		
                    .style("opacity", 0);	
            })
        
        if(aln_data.length < 20){ 
            /*container.append("line")
                .attr("x1",c1_st+2).attr("y1",c1_h)
                .attr("x2",c1_en-2).attr("y2",c1_h)
                .attr("stroke", "black")  
                //.attr("stroke-width",2)
                .attr("marker-start","url(#arrow)")
                .attr("marker-end","url(#arrow)");*/
            // target text         
            container.append('text')
                .attr("x",(c1_st+c1_en)/2).attr("y",c1_h+10)
                .style("fill", "black")
                .style("font-size", "10px")
                .attr("text-anchor", "middle")
                .attr("font-weight", "normal") 
                .text(`${o_c1_st} - ${o_c1_en}`);
            // query text
            container.append('text')
                .attr("x",(c2_st+c2_en)/2).attr("y",c2_h-5)
                .style("fill", "black")
                .style("font-size", "10px")
                .attr("text-anchor", "middle")
                .attr("font-weight", "normal") 
                .text(`${o_c2_st} - ${o_c2_en}`);
        }


    }
    // format the d as input for drawing the alignment
    function draw_alignment(d, i){
        help_draw_alignment(d.c1_nm, d.c1_st, d.c1_en, d.c2_nm, d.c2_st, d.c2_en, d.id, d.strand);
    }

    function draw_x_and_y_scale(){
        // draw the x axis 
        var xAxis = (g, x) => g
            .attr('transform', `translate(0, ${margin.top-10})`)
            .call(d3.axisTop(x).ticks(6));

        container.append("g")
            .call(xAxis, xz);

        /*
        var xmin = xz(d3.min(aln_data, function(d) { return d3.min([d.c1_st,d.c2_st]) }));
        var xmax = xz(d3.max(aln_data, function(d) { return d3.max([d.c1_en,d.c2_en]) }));
        // add contig lines 
        var n = ct_names[1]
        container.append("line")
                .attr("x1", 0).attr("y1",yscale_d(n))
                .attr("x2", xmax).attr("y2",yscale_d(n))
                .attr("stroke", "gray")  
                .attr("stroke-width",1);
        */

        // draw the y axis
        container.append('g')
            .attr('transform', `translate(0, 0)`)
            .attr("opacity", 1)
            .attr("fill", "black")
            .call(d3.axisRight(yscale_d));
        
    };
    draw_x_and_y_scale();
    
    
    // add in the data 
    function draw_data(xz){
        container.selectAll('g.item')
            .data(aln_data)
            .enter()
            .each(draw_alignment)
            .selectAll('path')
    };
    draw_data(xz);

    // zooming 
    container.call(zoom)
        .transition()
        .duration(750)
        .call(zoom.scaleTo, 1, [xscale(width),1] );

    function zoomed(event) {
        xz = event.transform.rescaleX(xscale);
        //xz = update(xz); //update global scale?
        console.log("xz: "+xz(100));
        console.log("x:  "+xscale(100));
        console.log("max_min\t"+ xz[0]+", " + xz[1]);
        d3.selectAll("svg > *").remove();
        draw_data(xz)
        draw_x_and_y_scale();
    }

}
miropeats_d3(aln_data);