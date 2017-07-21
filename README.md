# Quick Components
	

What is it: Component based web development. Build website by creating reusable dynamic components.

Why? Easy to start and setup on any environment. Created to get around having to downloads hundreds of required files and other node type scripting architecutre yet keeping react type modularitry.

Requirements: qcomps.js, JQuery 1.8+


## Usage:
```html	
<html>
<head>
	<title></title>
	<script type="text/javascript" src="js/jquery-2.1.4.js"></script>
	<script type="text/javascript" src="js/qcomps.js"></script>
</head>
<body>
<qcomp property='value'>my-component</qcomp>
</body>
</html>
```


### Structure of a component file as of version 1.5.10
```html
<global>
	/*
		Global scripts accessible by other components can set here <optional>
		Is parsed once as file is loaded
	*/

	//Will add this script to the head
	<script src='myscript.js'></script>

	

	//Will add this script to the component globals under generated name, can be used to provide initializations if you don't need to access any of its funtions
	<script>
		//stuff
	</script>

	//Will add this script to the component globals under the name 'utils' eg. _global.utils
	<script name='utils'>
		//stuff
	</script>
</global>
<component name='my-component'>
	<style>
		/*
			Styles specific to this component. <optional>
			A good place for default styling easily over written by document stylesheets.

		*/

		{ 
			/* 
				No selector applies style to the view. same as 'view { }' 
			*/
			font-family: 'arial'
		}

		.title{ 
			/* the selector in this case represents any object with the 
				title class that is a child of the view. same as 'view .title{ }' 
				it does not include the views root itself. see '&' for applying styles to the views root
			*/
			font-weight: bold;
		}

		&.active .title{ /* the '&' represents the components root view, same as view.active .title{ }. */
			background-color:green;
		}
	</style>

	<div class='my-component'>
		<!-- 
			Component view 
			Simple handlbar support
			as of version 1.5 if you include Mustache.js it will parse templates
			Views should always be contained in an external tag... there are some exceptions when you don't have too... but as a rule contain views in a tag
		-->
		<span class='title'>{title}</span>
	</div>

	<script>
		/* The script is the controller of the component  
			special variables inside the controller:
				_view / _self(deprecated) - Reference to the component view 
				_options - An object containing properties sent to the component during creation
				_global - reference to the globals object 

			Special functions inside controller:
				_onAdded - called when view is added to the dom
				_onRemoved - called when view is removed from the dom
		*/

	</script>
	
</component>
```

## Global Helper Functions /Classes

Function ImportComponents(path<String / Array>) -> Loads external component files.
```javascript
ImportComponents([
	'comp1.comp',
	'comp2.comp'
])
```
Class QComponent(id<componenet id / component object>, options <options object>) => Initializes a new component object
```javascript
var item = new QComponent('my-item', {title:"My Item"});
```
`QComponent.view` => A Reference to the view (jquery dom object) of the component
```javascript
$('body').append(item.view); //appends the components view to the body
```
`QComponent.controller` => A reference to the script of the component
```javascript
item.controller.myFunction(); //run myFunction which has been defined in the component script and exposed.
```
```html
<component name='my-item'>
	<div>{title}</div>
	<script>
		var title = _options.title;
		this.getTitle = function(){
			return title;
		}
		this.setTitle = function(t){
			title = t;
			_view.text(t);
		}
	</script>
</component>
```

## Passing properties to Components:

Properties are passed via the qcomp tags attribute strings. 
They can be used in the handlebars and they populate _options object in the controller.

There are a few special attributes that are handled differently:
#####	id -> is added to the components compiled root tag
#####	class -> adds the specififed classes to the compiled components root tag
#####	style -> adds specified styles to the compiled components root tag

#Attribute value casting:
#####	bool: forces a boolean value
		eg. <qcomp enabled:bool="true">my-component</qcomp>

#####	number: forces a number value
		eg. <qcomp count:number='5'>my-component</qcomp>

#####	string<default>: A string value this is default without a cast.

#####	json: creates an object from a json string  
		eg. <qcomp props:json='{"item": "hello items", "item2": "hello item2" }'>my-component</qcomp>

#####	keyval: creates an object from key value pair (key:value;key:value)
		eg. <qcomp props:keyval="item:hello items;item2:hello item2">my-component</qcomp>

#####	attr: forces the attribute to be added to the compiled component root tag
		eg. <qcomp name:attr='myComp1'>my-component</qcomp>

###### Component File comps.comp:
```html
<component name='my-component'>
	<div class='my-component' style='color:#000'>
		{title}
		{props.item}
	</div>
	<script>
		var title = _options.title;
		this.getTitle = function(){
			return title;
		}
		this.setTitle = function(t){
			title = t;
			_view.text(t);
		}
	</script>
</component>
```
###### HTML:
```html
<html>
<head>
	<title></title>
	<script type="text/javascript" src="js/jquery-2.1.4.js"></script>
	<script type="text/javascript" src="js/qcomps.js"></script>
	<script>
		ImportComponents('comps.comp');
	</script>
</head>
<body>
<qcomp title='Hello World' class='myworld' style='font-weight:bold' props:json='{"item": "hello items", "item2": "hello item2"}'>my-component</qcomp>
</body>
</html>
```
###### OUTPUT:
```html
<html>
<head>
	<title></title>
	<script type="text/javascript" src="js/jquery-2.1.4.js"></script>
	<script type="text/javascript" src="js/qcomps.js"></script>
	<script>
		ImportComponents('comps.comp');
	</script>
</head>
<body>
<div class='my-component myworld' style='color:#000;font-weight:bold'>
	Hello World
	hello items
</div>
</body>
</html>
```

## Nesting Components:
	Nested components inherit the propeties(_options) from their parents unless overridden by their own. 
	This does not include the special properties (id, class, style).

```html
<component name='my-component'>
	<div>
		<qcomp>my-component-header</qcomp>
		<qcomp title="Some other Title">my-component-header</qcomp>
	</div>
</component>
<component name='my-component-header'>
	<div>{title}</div>
</component>

<body>
	<qcomp title="Hello World">my-component</qcomp>
</body>
```
Output:
```html
<body>
	<div>
		<div>Hello World<div>
		<div>Some other Title</div>
	</div>
</body>
```

## Compiling components programmatically:
```javascript
var myComp = new QComponent('my-component', {title:"Hello World"});
$('body').append(myComp.view);
```
