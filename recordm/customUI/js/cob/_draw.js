//TODO add the same for touchpads
//main()

function handleInstanceCustomizations() {
   const imageMatcher = /[$]image(\(.+\))?/;
   const readOnlyMatcher = /[$]readonly/;
   const fileMatcher = /[$]file/;
   const canvasMatcher = /[$]draw/;

   window.defaultView = null
   const canvasToUploadMap = new Map();
   let saveBTN;
   function onCanvasUploaded(responseValue,fp) {
      fp.setValue(responseValue);
      canvasToUploadMap.delete(fp.field.fieldDefinition.id)
      if(canvasToUploadMap.size==0){
         saveBTN.click()
      }
   }
   function uploadFile(blob,instance,fp,ui,op) {
      var data = new FormData();
      if(op=="DELETE"){
         onCanvasUploaded(null,fp)
         return;
      }
      data.append("file",blob);
      var request = jQuery.ajax({
         url: `recordm/instances/${instance.data.attachmentPath}/files/${fp.field.fieldDefinition.id}`,
         data: data,
         cache: false,
         contentType: false,
         processData: false,
         method: 'POST',
         type: 'POST', // For jQuery < 1.9
         success: function(responseText){
            onCanvasUploaded($(responseText)[0].textContent,fp)
         },
         error: function(msg) {
            log.debug(msg)
            ui.notification.showError(`An error ocurred while uploading the drawing image of field ${fp.field.fieldDefinition}`,true);
         }
      });
      return request;
   }

   cob.custom.customize.push(function (core, utils, ui) {
      core.customizeAllInstances((instance, presenter) => {
         if (presenter.isGroupEdit()) return;

         const canvasFPs = presenter.findFieldPs((fp) => canvasMatcher.exec( fp.field.fieldDefinition.description )
         && fileMatcher.exec( fp.field.fieldDefinition.description ));

         const widthRegex = /\$draw\(\[.*width:(\d+).*\]\)/;
         const heightRegex = /\$draw\(\[.*height:(\d+).*\]\)/;

         canvasFPs.forEach((fp) => {
            if(!instance.isNew() && fp.field.fieldDefinition.description.match(readOnlyMatcher)){
               return
            }

            let id = Date.now().toString();
            const canvasDivParent = $(`<div class='dollarDrawingBoard' id=${id}></div>`)[0];
            let width = getRegexValue(fp.field.fieldDefinition.description,widthRegex)
            let height = getRegexValue(fp.field.fieldDefinition.description,heightRegex)

            if(width){
               canvasDivParent.style.width = width
            }
            if(height){
               canvasDivParent.style.height = height
            }
            let fieldPresenter = fp.content()[0];

            let controlDIV = fieldPresenter.querySelector(".controls")
            controlDIV.style.display="none"
            controlDIV.parentElement.appendChild(canvasDivParent)

            let myBoard = new DrawingBoard.Board(id,{droppable:true,webStorage:false,
               controls:[{ Navigation: { forward: false, back: false }}]});
            myBoard.addControl('Download');


            let imgLink;
            if(!instance.isNew()
            && (imgLink = fp.field.fieldDefinition.description.match(imageMatcher)
                  ? $(fieldPresenter).find(".link-container a")[0] && $(fieldPresenter).find(".link-container a")[0].href
                  : null)
               )
            {
               let img = new Image();
               img.onload = function() {
                  scaleAndCenterImage(img,myBoard.canvas.getContext("2d"),1)
               };
               img.src = imgLink;
            }

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
                           scaleAndCenterImage(img,  myBoard.canvas.getContext("2d"),0.95)
                           stoppedDrawingHandler()
                        }
                     }
                  }
               } else {
                  console.debug("File loaded is not an image!")
               }
            }

            myBoard.ev.bind('board:reset', ()=>{
               if(imgLink){
                  let obj = canvasToUploadMap.get(fp.field.fieldDefinition.id)
                  if(!obj){
                     obj = {canvas:myBoard.canvas,instance:instance,fp:fp,op:"DELETE"}
                     canvasToUploadMap.set(fp.field.fieldDefinition.id,obj)
                  }
                  obj.op = "DELETE"
               }else{
                  canvasToUploadMap.delete(fp.field.fieldDefinition.id)
               }
            });

            myBoard.ev.bind('board:stopDrawing', ()=>{
               stoppedDrawingHandler()
            });

            function stoppedDrawingHandler() {
               if(!canvasToUploadMap.has(fp.field.fieldDefinition.id)){
                  canvasToUploadMap.set(fp.field.fieldDefinition.id,{canvas:myBoard.canvas,instance:instance,fp:fp,op:"POST"})
               }
            }


            function tbnClickFunc(e) {
               if (canvasToUploadMap.size > 0){
                  e.stopPropagation()
                  canvasToUploadMap.forEach( (v,k) => {
                     v.canvas.toBlob((blob)=>{
                        const myFile = new File([blob],`drawing_${k}.png`, {
                           type: blob.type,
                        });
                        uploadFile(myFile,v.instance,v.fp,ui,v.op)
                     })
                  })
               }
            }
            if(!saveBTN){
               saveBTN = document.getElementsByClassName("js-save-instance")[0]
               saveBTN.onclick = tbnClickFunc
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

function scaleAndCenterImage(img, ctx,ratioFactor) {
   var canvas = ctx.canvas ;
   var hRatio = canvas.width  / img.width    ;
   var vRatio =  canvas.height / img.height  ;
   var ratio  = Math.min ( hRatio, vRatio ) * ratioFactor;
   var centerShift_x = ( canvas.width - img.width*ratio ) / 2;
   var centerShift_y = ( canvas.height - img.height*ratio ) / 2;
   ctx.drawImage(img, 0,0, img.width, img.height,centerShift_x,centerShift_y,img.width*ratio, img.height*ratio);
}
handleInstanceCustomizations()