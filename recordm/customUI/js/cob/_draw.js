      //TODO add the same for touchpads
//main()

function handleInstanceCustomizations() {
   window.defaultView = null
   const instanceMap = new Map();
   let saveBTN;
   
   function uploadFile(blob,instance,fp,ui) {
      var data = new FormData();
      data.append("file",blob);

      var request = jQuery.ajax({
         url: `recordm/instances/${instance.data.attachmentPath}/files/${fp.field.fieldDefinition.id}`,
         data: data,
         cache: false,
         contentType: false,
         processData: false,
         method: 'POST',
         type: 'POST', // For jQuery < 1.9
         success: function(data){
            var html = $(data)[0];
            fp.setValue(html.textContent)
            instanceMap.delete(fp.field.fieldDefinition.id)

            if(instanceMap.size==0){
               saveBTN.click()
            }
         },
         error: function name(msg) {
            ui.notification.showError(`An error ocurred uploading the drawing image of field ${fp.field.fieldDefinition}`,true);
         }
      });
      return request;
   }
   const fileMatcher = /[$]file/;
   const canvasMatcher = /[$]canvas/;

   cob.custom.customize.push(function (core, utils, ui) {
      core.customizeAllInstances((instance, presenter) => {
         if (presenter.isGroupEdit()) return;
         
         const canvasFPs = presenter.findFieldPs((fp) => canvasMatcher.exec( fp.field.fieldDefinition.description ) 
         && fileMatcher.exec( fp.field.fieldDefinition.description ));

         const widthRegex = /\$canvas\(\[.*width:(\d+).*\]\)/;
         const heightRegex = /\$canvas\(\[.*height:(\d+).*\]\)/;

         canvasFPs.forEach((fp) => {
            let id = Date.now().toString();
            const canvasDivParent = $(
               `<div class='dollarDrawingBoard' id=${id}></div>`
            )[0];
            let width = getRegexValue(fp.field.fieldDefinition.description,widthRegex)
            let height = getRegexValue(fp.field.fieldDefinition.description,heightRegex)

            if(width){
               canvasDivParent.style.width = width
            }
            if(height){
               canvasDivParent.style.height = height
            }

            let controlDIV = fp.content()[0].parentElement.querySelector(".controls")
            controlDIV.style.display="none"
            controlDIV.parentElement.appendChild(canvasDivParent)

            let myBoard = new DrawingBoard.Board(id,{droppable:true,webStorage:false});
            myBoard.addControl('Download');

            //CREATE AN UPLOAD BUTTON TO INSERT AN IMAGE TO CANVAS   
            const addImageButton = $(`<div class="drawing-board-control"> 
               <input type="file" id="file_${id}" name="name_${id}">
               <button class="btn btn-small "> <i class="icon-upload"></i> </button>
            </div>`)[0]
            canvasDivParent.children[0].appendChild(addImageButton)
            addImageButton.children[1].onclick=(evt)=>{
               addImageButton.children[1].blur()
               addImageButton.children[0].click()
            }

            addImageButton.children[0].onchange=(evt)=>{
               
               let img = new Image();
               let file =  evt.target.files[0];
               if(file && file.type.match('image.*')) {
                  var reader = new FileReader();
                  // Read in the image file as a data URL.
                  reader.readAsDataURL(file);
                  reader.onload = function(evt){
                     if( evt.target.readyState == FileReader.DONE) {
                        img.src = evt.target.result;
                        img.onload = ()=>{
                           scaleAndCenterImage(img,  myBoard.canvas.getContext("2d"))
                           stoppedDrawingHandler()
                        }
                     }
                  }    
               } else {
                  console.debug("File loaded is not an image!")
               }
            }

            myBoard.ev.bind('board:reset', ()=>{
               instanceMap.delete(fp.field.fieldDefinition.id)
            });
            
            myBoard.ev.bind('board:stopDrawing', ()=>{
               stoppedDrawingHandler()
            });

            function stoppedDrawingHandler() {
               if(saveBTN==undefined){
                  saveBTN = document.getElementsByClassName("js-save-instance")[0]
                  saveBTN.onclick = tbnClickFunc
               }      
               if(!instanceMap.has(fp.field.fieldDefinition.id)){
                  instanceMap.set(fp.field.fieldDefinition.id,{canvas:myBoard.canvas,instance:instance,fp:fp})
               }
            }

            function tbnClickFunc(e) {
               if (instanceMap.size > 0){
                  e.stopPropagation()
                  instanceMap.forEach( (v,k) => {
                     v.canvas.toBlob((blob)=>{
                        const myFile = new File([blob],`drawing_${k}.png`, {
                           type: blob.type,
                        });
                        uploadFile(myFile,v.instance,v.fp,ui)
                     })
                  })
               }
            }
         });
      })
   });
}

function getRegexValue(input,regex) {
   const match = input.match(regex);
   if (match) {
      return `${match[1]}px`;
   }
   return null;
}

function scaleAndCenterImage(img, ctx) {
   var canvas = ctx.canvas ;
   var hRatio = canvas.width  / img.width    ;
   var vRatio =  canvas.height / img.height  ;
   var ratio  = Math.min ( hRatio, vRatio ) * 0.95;
   var centerShift_x = ( canvas.width - img.width*ratio ) / 2;
   var centerShift_y = ( canvas.height - img.height*ratio ) / 2;  
   ctx.drawImage(img, 0,0, img.width, img.height,centerShift_x,centerShift_y,img.width*ratio, img.height*ratio);  
}
handleInstanceCustomizations()