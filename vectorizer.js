class Vectorizer{
    constructor(){
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.image = document.querySelector('img');
        this.canvas.width = this.image.width;
        this.canvas.height = this.image.height;
        
        this.imgData; 
                this.palette = [];

        //Output from colorQuantization
        this.indexedColor;

        this.kMean = 3;

        //Output from layering
        this.layer;

        //Output from lineScan
        this.paths;
        
        //Output from genInterNodes
        this.inserted;

        //Output from traceLines
        this.segmentPoints;

        //Determining the direction for each cases of marching squares algorithm
        this.lookup = [
            [[-1,-1,-1,-1], [-1,-1,-1,-1], [-1,-1,-1,-1], [-1,-1,-1,-1]],
            [[ 0, 1, 0,-1], [-1,-1,-1,-1], [-1,-1,-1,-1], [ 0, 2,-1, 0]],
            [[-1,-1,-1,-1], [-1,-1,-1,-1], [ 0, 1, 0,-1], [ 0, 0, 1, 0]],
            [[ 0, 0, 1, 0], [-1,-1,-1,-1], [ 0, 2,-1, 0], [-1,-1,-1,-1]],
            
            [[-1,-1,-1,-1], [ 0, 0, 1, 0], [ 0, 3, 0, 1], [-1,-1,-1,-1]],
            [[13, 3, 0, 1], [13, 2,-1, 0], [ 7, 1, 0,-1], [ 7, 0, 1, 0]], //resolving ambiguity of case 5 in marching squares algorithm
            [[-1,-1,-1,-1], [ 0, 1, 0,-1], [-1,-1,-1,-1], [ 0, 3, 0, 1]],
            [[ 0, 3, 0, 1], [ 0, 2,-1, 0], [-1,-1,-1,-1], [-1,-1,-1,-1]],
            
            [[ 0, 3, 0, 1], [ 0, 2,-1, 0], [-1,-1,-1,-1], [-1,-1,-1,-1]],
            [[-1,-1,-1,-1], [ 0, 1, 0,-1], [-1,-1,-1,-1], [ 0, 3, 0, 1]],
            [[11, 1, 0,-1], [14, 0, 1, 0], [14, 3, 0, 1], [11, 2,-1, 0]], // resolving ambiguity of case 10 in marching squares algorithm
            [[-1,-1,-1,-1], [ 0, 0, 1, 0], [ 0, 3, 0, 1], [-1,-1,-1,-1]],
            
            [[ 0, 0, 1, 0], [-1,-1,-1,-1], [ 0, 2,-1, 0], [-1,-1,-1,-1]],
            [[-1,-1,-1,-1], [-1,-1,-1,-1], [ 0, 1, 0,-1], [ 0, 0, 1, 0]],
            [[ 0, 1, 0,-1], [-1,-1,-1,-1], [-1,-1,-1,-1], [ 0, 2,-1, 0]],
            [[-1,-1,-1,-1], [-1,-1,-1,-1], [-1,-1,-1,-1], [-1,-1,-1,-1]]
        ];
    }

    init(){
        document.body.appendChild(this.canvas);
    }

    loadImage(){
        
        this.ctx.drawImage(this.image,0,0,this.canvas.width,this.canvas.height);
        this.imgData = this.ctx.getImageData(0,0,this.canvas.width, this.canvas.height);   
        console.log(this.imgData.data);
    }

    //create color palette from image
    paletteFromImage(){
        let palette = [];
        let index, p = 4,q = 4;
        let gridx = this.image.width/ (p+1), gridy = this.image.height/ (q+1);
        this.palette = [];

        for (let j=0; j<q; j++){
            for (let i=0; i<p; i++){
                
                index = Math.floor( ( ((j+1)*gridy)*this.image.width)+((i+1)*gridx) ) * 4;
                console.log({r: this.imgData.data[index], g:this.imgData.data[index+1], b:this.imgData.data[index+2], a:this.imgData.data[index+3]});
                palette.push({r: this.imgData.data[index], g:this.imgData.data[index+1], b:this.imgData.data[index+2], a:this.imgData.data[index+3]});
            }
        }
      
        console.log(palette);
        return palette;
        
    }

    //1. Color Quantization using clustering 
    colorQuantization(){

        let palette = this.paletteFromImage();

        let paletteAvg = [], currIdx, maxDist, currDist;
        this.indexedColor = [];

        //set indexedColor array to -1
        for (let j = 0; j < this.image.height + 2; j++){
            this.indexedColor[j] = [];
            for(let i = 0; i < this.image.width + 2; i++){
                this.indexedColor[j][i] = -1;
            }
        }
        //Clustering of kMean number of times
        for (let a= 0; a < this.kMean ; a++){
            for( let i=0; i < palette.length; i++){
                paletteAvg[i] = {r:0, g:0, b:0, a:0, n:0};
                console.log()
            }
            if (a>0){
                //Average colors to form a color palette
                for(let k = 0 ; k < this.palette.length ; k++){
                    if (this.palette[k].n > 0){
                        this.palette[k] = {
                            r: Math.floor( paletteAvg[k].r / paletteAvg[k].n ),
                            g: Math.floor( paletteAvg[k].g / paletteAvg[k].n ),
                            b: Math.floor( paletteAvg[k].b / paletteAvg[k].n ),
                            a:  Math.floor( paletteAvg[k].a / paletteAvg[k].n ) 
                        };
                    }
                }
            }
            for(let j = 0; j < this.image.height; j++){
                for(let i = 0; i < this.image.width; i++){

                    let index = (j * this.image.width + i) * 4;
                    currIdx = 0, maxDist = 1024;

                    //calculating euclidean distance between each pixel and palette colors
                    for(let k = 0;k < this.palette.length; k++){
                        currDist = Math.floor( Math.sqrt( Math.pow(this.palette[k].r - this.imgData.data[index], 2) + 
                                                          Math.pow(this.palette[k].g - this.imgData.data[index+1], 2) + 
                                                          Math.pow(this.palette[k].b - this.imgData.data[index+2], 2) +
                                                          Math.pow(this.palette[k].a - this.imgData.data[index+3], 2) ));

                        if (currDist < maxDist){
                            currIdx = k;
                            maxDist = currDist;
                        }
                    }

                    //adding nearest colors to a palette for averaging
                    paletteAvg[currIdx].r += this.imgData.data[index];
                    paletteAvg[currIdx].g += this.imgData.data[index+1];
                    paletteAvg[currIdx].b += this.imgData.data[index+2];
                    paletteAvg[currIdx].a += this.imgData.data[index+3];
                    paletteAvg[currIdx].n += 1;

                    this.indexedColor[j+1][i+1] = currIdx;
                }
            }
        }
        
    }

    layering(cnum){
        let layer = [];
        let arrH = this.indexedColor.length, arrW = this.indexedColor[0].length;

        for (let j = 0; j < arrH; j++){
            layer[j] = [];
            for (let i = 0; i < arrW ; i++){
                layer[j][i] = 0;
            }
        }

        for (let j = 1; j < arrH; j++){
            for (let i = 1; i < arrW ; i++){
                layer[j][i] = (this.indexedColor[j-1][i-1] == cnum ? 1 : 0) + (this.indexedColor[j-1][i] == cnum? 2 : 0) + (this.indexedColor[j][i] == cnum ? 4 : 0) + (this.indexedColor[j][i-1] == cnum? 8 : 0);
            }
        }
        return layer;
    
    }

    isBoundingBox(parent, child){
        if( (parent[0] < child[0]) && (parent[1] < child[1]) && (parent[2] > child[2]) && (parent[3] > child[3]) )
            return true;
    }

    lineScan(layer){
        let paths = [];
        let arrH = layer.length, arrW = layer[0].length;
        let pathCnt = 0, pointCnt = 0, px = 0, py = 0, dir = 0, pathComplete = true, holePath = false, lookupRow;

        for(let j = 0 ; j < arrH ; j++){
			for(let i = 0 ; i < arrW ; i++){

				if( (layer[j][i] == 4) || (layer[j][i] == 11) ){
                    px = i;
                    py = j;

                    paths[pathCnt] = {};
                    paths[pathCnt].points = [];
					paths[pathCnt].boundingbox = [px,py,px,py];
					paths[pathCnt].holechildren = [];
					pathComplete = false;
					pointCnt = 0;
					holePath = ( layer[j][i] == 11);
                    dir = 1;
                    
                    while(!pathComplete){

                        //Identify path points
                        paths[pathCnt].points[pointCnt] = {};
                        paths[pathCnt].points[pointCnt].x = px - 1;
                        paths[pathCnt].points[pointCnt].y = py - 1;
                        paths[pathCnt].points[pointCnt].t = layer[py][px];

                        //Bounding Box
                        if( (px-1) < paths[pathCnt].boundingbox[0] ){ paths[pathCnt].boundingbox[0] = px-1; }
						if( (px-1) > paths[pathCnt].boundingbox[2] ){ paths[pathCnt].boundingbox[2] = px-1; }
						if( (py-1) < paths[pathCnt].boundingbox[1] ){ paths[pathCnt].boundingbox[1] = py-1; }
						if( (py-1) > paths[pathCnt].boundingbox[3] ){ paths[pathCnt].boundingbox[3] = py-1; }
                   
                        lookupRow = this.lookup[layer[py][px]][dir];
                        layer[py][px] = lookupRow[0]; dir = lookupRow[1]; px += lookupRow[2]; py += lookupRow[3];
                   
                        if( (px-1 == paths[pathCnt].points[0].x ) && ( py-1 == paths[pathCnt].points[0].y ) ){
							pathComplete = true;
							
							// Discarding paths shorter than pathomit
							if( paths[pathCnt].points.length < 8 ){
								paths.pop();
							}else{
							
								paths[pathCnt].isholepath = holePath ? true : false;
								
								// Finding the parent shape for this hole
								if(holePath){
									
									var parentidx = 0, parentbbox = [-1,-1, arrW + 1, arrH + 1];
									for(var parentcnt=0; parentcnt < pathCnt; parentcnt++){
										if( (!paths[parentcnt].isholepath) &&
											this.isBoundingBox( paths[parentcnt].boundingbox , paths[pathCnt].boundingbox ) &&
											this.isBoundingBox( parentbbox , paths[parentcnt].boundingbox )
										){
											parentidx = parentcnt;
											parentbbox = paths[parentcnt].boundingbox;
										}
									}
									
									paths[parentidx].holechildren.push( pathCnt );
									
								}// End of holepath parent finding
								
								pathCnt++;
							
							}
							
						}// End of Close path
						
						pointCnt++;
						
					}
                   
                }
            }
        }
        return paths;
    }

    getDirection(x1, y1, x2, y2){
        let direction = 8;

        if(x1 < x2){
			if     (y1 < y2) direction = 1; // SouthEast
			else if(y1 > y2) direction = 7; // NE
			else             direction = 0; // E
        }
        
        else if(x1 > x2){
			if     (y1 < y2) direction = 3; // SW
			else if(y1 > y2) direction = 5; // NW
			else             direction = 4; // W
        }
        
        else{
			if     (y1 < y2) direction = 2; // S
			else if(y1 > y2) direction = 6; // N
			else             direction = 8; // center, this should not happen
        }
        
		return direction;
    }

    //a, b, c, d, e represents index 1, 2, 3, 4, 5
    rightAngleTest(path, a, b, c, d, e){
        if ( (( path.points[c].x == path.points[a].x) &&
              ( path.points[c].x == path.points[b].x) &&
              ( path.points[c].y == path.points[d].y) &&
              ( path.points[c].y == path.points[e].y)) 
              ||
             (( path.points[c].y == path.points[a].y) &&
              ( path.points[c].y == path.points[b].y) &&
              ( path.points[c].x == path.points[d].x) &&
              ( path.points[c].x == path.points[e].x))
            )
            return true;
    }


    genInterNodes(paths){
        let inserted = [];
		let  pointLen=0, nextidx=0, nextidx2=0, previdx=0, previdx2 = 0, pathCnt, pointCnt;
		
		// paths loop
		for(pathCnt = 0; pathCnt < paths.length; pathCnt++){
			
			inserted[pathCnt] = {};
			inserted[pathCnt].points = [];
			inserted[pathCnt].boundingbox = paths[pathCnt].boundingbox;
			inserted[pathCnt].holechildren = paths[pathCnt].holechildren;
			inserted[pathCnt].isholepath = paths[pathCnt].isholepath;
			pointLen = paths[pathCnt].points.length;
			
			// pathpoints loop
			for(pointCnt=0; pointCnt<pointLen; pointCnt++){
			
				// next and previous point indexes
                nextidx = (pointCnt+1) % pointLen; 
                nextidx2 = (pointCnt+2) % pointLen; 
                previdx = (pointCnt-1+pointLen) % pointLen; 
                previdx2 = (pointCnt-2+pointLen) % pointLen;
				
                // right angle enhance
                //not necessarily needed
				if(1 && this.rightAngleTest( paths[pathCnt], previdx2, previdx, pointCnt, nextidx, nextidx2 ) ){
					
					// Fix previous direction
					if(inserted[pathCnt].points.length > 0){
						inserted[pathCnt].points[ inserted[pathCnt].points.length-1 ].linesegment = this.getDirection(
								inserted[pathCnt].points[ inserted[pathCnt].points.length-1 ].x,
								inserted[pathCnt].points[ inserted[pathCnt].points.length-1 ].y,
								paths[pathCnt].points[pointCnt].x,
								paths[pathCnt].points[pointCnt].y
							);
					}
					
					// This corner point
					inserted[pathCnt].points.push({
						x : paths[pathCnt].points[pointCnt].x,
						y : paths[pathCnt].points[pointCnt].y,
						linesegment : this.getDirection(
								paths[pathCnt].points[pointCnt].x,
								paths[pathCnt].points[pointCnt].y,
								(( paths[pathCnt].points[pointCnt].x + paths[pathCnt].points[nextidx].x ) /2),
								(( paths[pathCnt].points[pointCnt].y + paths[pathCnt].points[nextidx].y ) /2)
							)
					});
					
				}// End of right angle enhance
				
				// interpolate between two path points
				inserted[pathCnt].points.push({
					x : (( paths[pathCnt].points[pointCnt].x + paths[pathCnt].points[nextidx].x ) /2),
					y : (( paths[pathCnt].points[pointCnt].y + paths[pathCnt].points[nextidx].y ) /2),
					linesegment : this.getDirection(
							(( paths[pathCnt].points[pointCnt].x + paths[pathCnt].points[nextidx].x ) /2),
							(( paths[pathCnt].points[pointCnt].y + paths[pathCnt].points[nextidx].y ) /2),
							(( paths[pathCnt].points[nextidx].x + paths[pathCnt].points[nextidx2].x ) /2),
							(( paths[pathCnt].points[nextidx].y + paths[pathCnt].points[nextidx2].y ) /2)
						)
				});
				
			}// End of pathpoints loop
						
        }// End of paths loop
        return inserted;
    }
    


    traceLines(singlePath){
        let pointCnt = 0, segtype1, segtype2, seqend;
        let segmentPoints = {};
        segmentPoints.segments = [];
        segmentPoints.boundingbox = singlePath.boundingbox;
		segmentPoints.holechildren = singlePath.holechildren;
        segmentPoints.isholepath = singlePath.isholepath;
        
        while(pointCnt < singlePath.points.length){
            // Find sequences that belong to only 2 directions
            
            segtype1 = singlePath.points[pointCnt].linesegment; 
            segtype2 = -1; 
            seqend = pointCnt + 1;
			while(
				((singlePath.points[seqend].linesegment === segtype1) || (singlePath.points[seqend].linesegment === segtype2) || (segtype2 === -1))
				&& (seqend < singlePath.points.length-1) )
				{
				
                    if((singlePath.points[seqend].linesegment!==segtype1) && (segtype2===-1)){ segtype2 = singlePath.points[seqend].linesegment; }
                    
                    seqend++;
				
			    }
			if(seqend === singlePath.points.length-1){ seqend = 0; }

			// 5.2. - 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences
			segmentPoints.segments = segmentPoints.segments.concat( this.traceSequence(singlePath, pointCnt, seqend) );
			
			// forward pcnt;
			if(seqend>0){ pointCnt = seqend; }else{ pointCnt = singlePath.points.length; }
			
        }// End of pcnt loop
        return segmentPoints;
    }

    traceSequence(singlePath, seqstart, seqend){

		// variables
        let errorpoint = seqstart, errorval = 0, curvepass = true, px, py, distance;
        let ltres = 1, qtres = 1;
        let tl = (seqend-seqstart); 
        if( tl < 0 ) { tl += singlePath.points.length; }

		let vx = (singlePath.points[seqend].x-singlePath.points[seqstart].x) / tl,
			vy = (singlePath.points[seqend].y-singlePath.points[seqstart].y) / tl;
		
		// 5.2. Fit a straight line on the sequence
        let pointCnt = (seqstart + 1) % singlePath.points.length, pl;
        
		while(pointCnt != seqend){
            pl = pointCnt-seqstart; 
            if( pl < 0 ) { pl += singlePath.points.length; }

            px = singlePath.points[seqstart].x + vx * pl; 
            py = singlePath.points[seqstart].y + vy * pl;

			distance = Math.sqrt(Math.pow( (singlePath.points[pointCnt].x-px), 2) + Math.pow( (singlePath.points[pointCnt].y-py) ,2));
            
            if(distance > ltres){curvepass=false;}
			if(distance > errorval){ 
                errorpoint = pointCnt; 
                errorval = distance; 
            }

			pointCnt = (pointCnt + 1) % singlePath.points.length;
		}
		// return straight line if fits
		if(curvepass){ 
            return [{ type:'L', x1:singlePath.points[seqstart].x, y1:singlePath.points[seqstart].y, x2:singlePath.points[seqend].x, y2:singlePath.points[seqend].y }]; 
        }
		
		// 5.3. If the straight line fails (distance error>ltres), find the point with the biggest error
		let fitpoint = errorpoint; curvepass = true; errorval = 0;
		
		// 5.4. Fit a quadratic spline through this point, measure errors on every point in the sequence
		// helpers and projecting to get control point
        let t = (fitpoint-seqstart) / tl, t1= Math.pow((1-t), 2), t2 = 2*(1-t)*t, t3 = Math.pow(t, 2);
        
		let cpx = (t1*singlePath.points[seqstart].x + t3*singlePath.points[seqend].x - singlePath.points[fitpoint].x)/-t2 ,
			cpy = (t1*singlePath.points[seqstart].y + t3*singlePath.points[seqend].y - singlePath.points[fitpoint].y)/-t2 ;
		
		// Check every point
		pointCnt = seqstart + 1;
		while(pointCnt != seqend){

            t = (pointCnt-seqstart)/tl;
            t1 = Math.pow((1-t), 2);
            t2 = 2*(1-t)*t;
            t3 = Math.pow(t, 2);
            
			px = t1 * singlePath.points[seqstart].x + t2 * cpx + t3 * singlePath.points[seqend].x;
			py = t1 * singlePath.points[seqstart].y + t2 * cpy + t3 * singlePath.points[seqend].y;
			
			distance = Math.sqrt( Math.pow( (singlePath.points[pointCnt].x-px), 2) + Math.pow( (singlePath.points[pointCnt].y-py), 2) );
			
			if(distance > qtres){ curvepass=false; }
			if(distance > errorval){ 
                errorpoint = pointCnt;
                errorval = distance; 
            }

			pointCnt = (pointCnt+1) % singlePath.points.length;
		}
		// return spline if fits
		if(curvepass){ return [{ type:'Q', x1: singlePath.points[seqstart].x, y1: singlePath.points[seqstart].y, x2: cpx, y2: cpy, x3: singlePath.points[seqend].x, y3: singlePath.points[seqend].y }]; }
		// 5.5. If the spline fails (distance error>qtres), find the point with the biggest error
		let splitpoint = fitpoint; 
		
		// 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences
	    return this.traceSequence( singlePath, seqstart, splitpoint ).concat(this.traceSequence( singlePath, splitpoint, seqend ) );
		
    }


    batchTraceLines(inserted){
        let btracedpaths = [];
        for (let i in inserted){
            btracedpaths.push(this.traceLines(inserted[i]));
        }
        return btracedpaths;
    }

    toSvgColor(c){
        return 'fill="rgb('+c.r+','+c.g+','+c.b+')" stroke="rgb('+c.r+','+c.g+','+c.b+')" stroke-width="'+ 1 +'" opacity="'+c.a/255.0+'" ';
    }

    svgPathString(tracedata, lnum, pathnum){
	
		let layer = tracedata.layers[lnum], smp = layer[pathnum], str='', pcnt, roundCoordinates = 1;
        
        //beginning of path string
		str =  '<path '+
        this.toSvgColor(tracedata.palette[lnum]) +
        'd="';
		
		// Creating non-hole path string
		if( roundCoordinates === -1 ){
			str += 'M '+ smp.segments[0].x1 +' '+ smp.segments[0].y1 +' ';
			for(pcnt=0; pcnt<smp.segments.length; pcnt++){
				str += smp.segments[pcnt].type +' '+ smp.segments[pcnt].x2 +' '+ smp.segments[pcnt].y2 +' ';
				if(smp.segments[pcnt].hasOwnProperty('x3')){
					str += smp.segments[pcnt].x3 +' '+ smp.segments[pcnt].y3 +' ';
				}
			}
			str += 'Z ';
		}else{
			str += 'M '+ Math.round( smp.segments[0].x1 , roundCoordinates ) +' '+ Math.round( smp.segments[0].y1 , roundCoordinates ) +' ';
			for(pcnt=0; pcnt<smp.segments.length; pcnt++){
				str += smp.segments[pcnt].type +' '+ Math.round( smp.segments[pcnt].x2 , roundCoordinates ) +' '+ Math.round( smp.segments[pcnt].y2 , roundCoordinates ) +' ';
				if(smp.segments[pcnt].hasOwnProperty('x3')){
					str += Math.round( smp.segments[pcnt].x3 , roundCoordinates ) +' '+ Math.round( smp.segments[pcnt].y3 , roundCoordinates ) +' ';
				}
			}
			str += 'Z ';
		}// End of creating non-hole path string
		
		// Hole children
		for( var hcnt=0; hcnt < smp.holechildren.length; hcnt++){
			var hsmp = layer[ smp.holechildren[hcnt] ];
			// Creating hole path string
			if( roundCoordinates === -1 ){
				
				if(hsmp.segments[ hsmp.segments.length-1 ].hasOwnProperty('x3')){
					str += 'M '+ hsmp.segments[ hsmp.segments.length-1 ].x3  +' '+ hsmp.segments[ hsmp.segments.length-1 ].y3  +' ';
				}else{
					str += 'M '+ hsmp.segments[ hsmp.segments.length-1 ].x2  +' '+ hsmp.segments[ hsmp.segments.length-1 ].y2  +' ';
				}
				
				for(pcnt = hsmp.segments.length-1; pcnt >= 0; pcnt--){
					str += hsmp.segments[pcnt].type +' ';
					if(hsmp.segments[pcnt].hasOwnProperty('x3')){
						str += hsmp.segments[pcnt].x2  +' '+ hsmp.segments[pcnt].y2  +' ';
					}
					
					str += hsmp.segments[pcnt].x1  +' '+ hsmp.segments[pcnt].y1  +' ';
				}
				
			}else{
				
				if(hsmp.segments[ hsmp.segments.length-1 ].hasOwnProperty('x3')){
					str += 'M '+ Math.round( hsmp.segments[ hsmp.segments.length-1 ].x3  ) +' '+ Math.round( hsmp.segments[ hsmp.segments.length-1 ].y3  ) +' ';
				}else{
					str += 'M '+ Math.round( hsmp.segments[ hsmp.segments.length-1 ].x2  ) +' '+ Math.round( hsmp.segments[ hsmp.segments.length-1 ].y2  ) +' ';
				}
				
				for(pcnt = hsmp.segments.length-1; pcnt >= 0; pcnt--){
					str += hsmp.segments[pcnt].type +' ';
					if(hsmp.segments[pcnt].hasOwnProperty('x3')){
						str += Math.round( hsmp.segments[pcnt].x2  ) +' '+ Math.round( hsmp.segments[pcnt].y2  ) +' ';
					}
					str += Math.round( hsmp.segments[pcnt].x1  ) +' '+ Math.round( hsmp.segments[pcnt].y1  ) +' ';
				}
				
				
			}// End of creating hole path string
			
			str += 'Z '; // Close path
			
		}// End of holepath check
		
		// Closing path element
        str += ` />`;
        
        return str;

    }
    
    getSvgString(tracedata){

		let svgstr = '<svg '  +
        'version="1.1" xmlns="http://www.w3.org/2000/svg" desc="Created with imagetracer.js version '+'" >';

		// Drawing: Layers and Paths loops
		for(let lcnt=0; lcnt < tracedata.layers.length; lcnt++){
			for(let pcnt=0; pcnt < tracedata.layers[lcnt].length; pcnt++){
				
				// Adding SVG <path> string
				if( !tracedata.layers[lcnt][pcnt].isholepath ){
					svgstr += this.svgPathString( tracedata, lcnt, pcnt);
				}
					
			}// End of paths loop
		}// End of layers loop
		
        svgstr += '</svg>';
        // console.log(svgstr);
		return svgstr;
    }
    
    appendSvgString(svgstr){

        let div1 = document.createElement('div');
        document.body.appendChild(div1);
        div1.innerHTML += svgstr;

    }

    run(){
        this.init();
        this.loadImage();
        this.colorQuantization();

        let traceData = {
            layers: [],
            palette: this.palette,
            width: this.indexedColor[0].length - 2,
            height: this.indexedColor.length - 2
        };

        for (let i = 0; i < traceData.palette.length; i++){
            let tracedLayer = this.batchTraceLines(this.genInterNodes(this.lineScan(this.layering(i))));
            traceData.layers.push(tracedLayer);
        }

        this.appendSvgString(this.getSvgString(traceData));
    }

}
let newObj = new Vectorizer();
newObj.run();   




