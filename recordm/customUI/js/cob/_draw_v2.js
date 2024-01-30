cob.custom.customize.push(function(core, utils, ui) {

  const readOnlyMatcher = /[$]readonly/;
  const fileMatcher = /[$]file/;
  const canvasMatcher = /[$]draw/;

  const widthRegex = /\$draw\(\[.*width:(\d+).*\]\)/;
  const heightRegex = /\$draw\(\[.*height:(\d+).*\]\)/;

  DrawingBoard.Control.Upload = DrawingBoard.Control.extend({
    name: "Upload",
    initialize: function() {
      this.$el.append(`<div class="drawing-board-control"> 
               <input type="file" name="file">
               <button class="btn btn-small js-draw-upload-image"> <i class="icon-upload"></i> </button>
            </div>`);

      this.$el.find("input").onchange = ((uploadEv) => {
        const file = uploadEv.target.files[0];
        if (file && file.type.match("image.*")) {
          const reader = new FileReader();
          // Read in the image file as a data URL.
          reader.readAsDataURL(file);
          reader.onload = function(evt) {
            if (evt.target.readyState === FileReader.DONE) {
              loadImageIntoBoard(evt.target.result, this.board);

            }
          };
        }
      });

      this.$el.on(".js-draw-upload-image.", "click", ".drawing-board-control-download-button", $.proxy(function(e) {
        const uploadButton = $(e.target);
        uploadButton.blur();

        const uploadInput = uploadButton.parent().find("input");
        uploadInput.click();
      }, this));
    },
  });

  function getRegexValue(input, regex, defaultValue) {
    const match = input.match(regex);
    return match ? `${match[1]}px` : `${defaultValue}px`;
  }

  function loadImageIntoBoard(imgSrc, board) {
    const image = new Image();
    image.onload(() => {
      // scale and center image
      const ctx = board.canvas.getContext("2d");
      const ratioFactor = 1; // TODO validate this

      const canvas = ctx.canvas;
      const hRatio = canvas.width / img.width;
      const vRatio = canvas.height / img.height;
      const ratio = Math.min(hRatio, vRatio) * ratioFactor;
      const centerShift_x = (canvas.width - img.width * ratio) / 2;
      const centerShift_y = (canvas.height - img.height * ratio) / 2;
      ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
    });

    image.src = imgSrc;
  }

  function createDrawingBoard(fp, width, height) {
    const boardId = Date.now().toString();

    const canvasDivParent = $(`<div class="dollarDrawingBoard" id="${boardId}" style="width: ${width}; height: ${height}"></div>`)[0];
    const fieldPresenterControls = fp.content()[0].querySelector(".controls");
    fieldPresenterControls.style.display = "none";
    fieldPresenterControls.parentElement.appendChild(canvasDivParent);

    const myBoard = new DrawingBoard.Board(boardId, {
      droppable: true,
      webStorage: false,
      controls: [{ Navigation: { forward: false, back: false } }],
    });

    myBoard.addControl("Download");

    return myBoard;
  }

  core.customizeAllInstances((instance, presenter) => {
    if (presenter.isGroupEdit()) return;

    presenter
      .findFieldPs((fp) => canvasMatcher.test(fp.field.fieldDefinition.description)
                           && fileMatcher.test(fp.field.fieldDefinition.description))
      .forEach(fp => {
        // TODO: ensure that we can see the drawing area in readonly mode

        const boardWidth = getRegexValue(fp.field.fieldDefinition.description, widthRegex, 400);
        const boardHeight = getRegexValue(fp.field.fieldDefinition.description, heightRegex, 400);

        const board = createDrawingBoard(fp, boardWidth, boardHeight);
        if (!instance.isNew() && fp.getValue()) {
          loadImageIntoBoard(`/recordm/recordm/instances/${instance.getId()}/files/${fp.fieldDefinition.id}/${fp.getValue()}`, board);
        }

      });
  });


});