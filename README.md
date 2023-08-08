# customize.keywords.draw
This repository will have an html canvas that will allow the user to draw an image on it using the mouse. 


## Saving
The drawing on the image is saved when the user clicks on the save button while creating or editing instances

## How to use
To use this customization the user must use one of the following descriptions:
**$file $draw([width:value,height:value])**
**$file $draw([height:value])**
**$file $draw([width:value])**

## Using with other descriptions
The above descriptions can be used with or without other descriptions, for example:
**$file $image $draw([width:value,height:value])**

# Note to the developer
This customization is also related to the _image customization, if the $draw is used, the image is displayed on the canvas when editing. On the _image customization, we are preventing the image from being displayed where it would be if we were just editing an instance without the $draw keyword
