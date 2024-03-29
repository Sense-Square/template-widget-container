<script>

    import { ProgressCircular, ProgressLinear, Icon, Button } from 'svelte-materialify/src';
	import { mdiAlertBox, mdiHammerWrench, mdiCog, mdiCheckBold } from '@mdi/js';
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import IntersectionObserver from "svelte-intersection-observer";
	import LangUtils from '../utils/lang_utils';
	import ErrorWrapper from './ErrorWrapper.svelte';
	import { theme, getBackground, getColor } from '../store/theme';
	import { blur } from 'svelte/transition';
	import * as WidgetIndex from '../widgets/index';

    // Theme handler
    let _theme = "light";
    let unsubscribeTheme = theme.subscribe(val => _theme = val);

    // Event dispatcher
	const dispatch = createEventDispatcher();

    // Props
	export let token = null;
	export let apikey = null;
	export let state = null;
	export let showContextualOptions = true;
	export let disableContextMenu = false;
	export let widgetId = null;
	export let lang = "en";

	//TODO: Capire quali di questi servono o meno
	export let widget;
	export let properties;
    export let showOptions = true;
	export let padding = 0;
    export let sessionID = null;
	export let parent = null;

	$: state, reloadWidget();

	// Intersection Observer Visibility
	let isWidgetVisible = false;
	let isFirstObservation = true;

	// Reload widget
	let reload = false;

	// Main ref widget
	let MAIN_REF;

	// Widget ref
	let WIDGET_REF, WIDGET = null;
	let off_changeOptions = null, off_changeChildOptions = null;

	// Maintenance priority
	let maintenancePriority = false;

	// Generic container configuration
	let genericContainer = {
		showCircleLoading: true,
		text: "Caricamento in corso",
	};

	// Reloader props
	let _stateID = null;

	// Widget dictionary
	let dict = false;

	// Auto refresh interval
	let _interval = null;

	// Show button options (if enabled)
	let showOptionButton = true;

	// Load the widget dictionary on mount
	onMount(async () => {

		// Load widget
		if(!widget)
			widget = await WidgetIndex.getWidget(widgetId);
		
		// Load properties	
		if(!properties)
			properties = await WidgetIndex.getPropreties(widgetId);

		// Load dictionary
		if(widgetId)
			dict = await loadDictionary(widgetId, lang);
		else
			dict = true;

		if(isWidgetVisible && widget && properties)
			loadWidget();

		if(!widget || !properties)
			showMaintenance("Il widget non è supportato da questa versione di square")

	});

	// Clear the interval and destroy everything when the widget get removed
	onDestroy(() => {

		// Clear interval (if exists)
		if(_interval)
			clearInterval(_interval);

		// Destroy the old instance of the widget (if exist)
		destroyWidget();

		// Unsubscribe theme store
		unsubscribeTheme();
	});

	// Load the dictionary for the widget
	async function loadDictionary(id, lang) {
		try {

			// Import index
			let index = (await import(`../widgets/${id}/lang/index.json`)).default;

			// Select dictionary
			if(index.includes(lang))
				return (await import(`../widgets/${id}/lang/${lang}.json`)).default;

			// Fallback language
			if(index.length > 0)
				return (await import(`../widgets/${id}/lang/${index[0]}.json`)).default;

			return true;

		} catch (error) {

			// console.log(error);
			return true;

		}
	}

	// Create dictionary object for the widget
	function getDictionary() {
		if(typeof(dict) === "object")
			return new LangUtils(lang, dict);
		return new LangUtils(lang, {});
	}

	// Wrapper actions
	function showResult() {
		if(maintenancePriority)
			return;
		genericContainer = null;
	}

	function showError(text="") {

		console.error(text);

		destroyWidget();

		if(maintenancePriority)
			return;
		genericContainer = {
			icon: mdiAlertBox,
			text: text,
			showReload: true,
			showConfig: true
		}
	}

	function showConfirm(text) {
		if(maintenancePriority)
			return;
		genericContainer = {
			icon: mdiCheckBold,
			text: text,
			showReload: true
		}
	}

	function showMaintenance(text, priority=false) {

		destroyWidget();

		if(maintenancePriority)
			return;
		maintenancePriority = priority;
 		genericContainer = {
			icon: mdiHammerWrench,
			text: text,
			showReload: true,
			showConfig: true
		}
	}

	function showLoading(text) {
		if(maintenancePriority)
			return;
		genericContainer = {
			showCircleLoading: true,
			text: text,
			showReload: true
		}
	}

	function showProgressBar(text, value=0) {
		if(maintenancePriority)
			return;
		genericContainer = {
			showProgressBar: true,
			progressBarValue: value,
			text: text,
			showReload: true
		}
	}

	// Prepare the form data object for the widget
	function getFormData() {
		let params = new FormData();
		if(token)
			params.append("token", token);
		else if(apikey)
			params.append("apikey", apikey);
		return params
	}

	// Update widget state
	function saveState(state, reload=true) {
		dispatch("saveState", state);
		if(reload)
			reloadWidget();
	}

	// Retrieve widget state
	function getState() {

		// Check if need setup
		let needSetup = false;
		if(state && typeof(state) === "object")
			Object.keys(state).forEach(key => {
				if(state[key] === null)
					needSetup = true;
				if(state[key] && typeof(state[key]) === "object")
					if(state[key].hasOwnProperty("value") && state[key].value === null)
						needSetup = true; 
			});
		if(needSetup){
			showMaintenance("Il widget richiede un setup", true);
			return null;
		}

		// Load timer refresh
		if(state && _interval === null && state.hasOwnProperty("_timer_refresh") && typeof(state._timer_refresh) === "number" && state._timer_refresh > 0)
			reloadEvery(state._timer_refresh).then(() => console.log("INTERVAL REMOVED"));

		return state;
	}

	// Reload the widget
	function reloadWidget() {

		// Remove maintenance priority (if enabled)
		maintenancePriority = false;

		showLoading();

		// Destroy the old instance of the widget (if exist)
		destroyWidget();
		
		// Create a new instance of the widget
		loadWidget();

	}

	// Destroy the instance of the widget (if exist)
	function destroyWidget() {
		if(WIDGET !== null){

			// Destroy widget
			WIDGET.$destroy();

			// Remove event listener
			if(off_changeOptions)
				off_changeOptions();
			if(off_changeChildOptions)
				off_changeChildOptions();

			// Reset variables
			WIDGET = null;
			off_changeOptions = null;
			off_changeChildOptions = null;
		}
	}

	// Create a new instance of the widget
	function loadWidget() {

		// Check if widget is already initialised
		if(WIDGET !== null || !WIDGET_REF || !isWidgetVisible || !dict)
			return;

		let state = getState();

		if(!state)
			return;

		// New widget instance
		WIDGET = new ErrorWrapper({
			target: WIDGET_REF,
			props: {
				widget,
				WIDGET_VISIBLE: true,
				showResult,
				showConfirm,
				showError,
				showMaintenance,
				showLoading,
				showProgressBar,
				updateProgressBar: showProgressBar,
				getFormData,
				saveState,
				showOptions_,
				openOptions,
				getDictionary,
				state,
				color: _getColor(_theme),
			}
		});

		// Trigger events
		off_changeOptions = WIDGET.$on("changeOptions", e => {
			if(showContextualOptions){
				dispatch("changeOptions", {
					widget: widget,
					state: state
				});
			}
		});

		off_changeChildOptions = WIDGET.$on("changeChildOptions", e => {
			dispatch("changeChildOptions", e.detail);
		});
	}

	// Show options 
	function showOptions_() {
		showOptionButton = true;
	}

	// Open widget configurator
	function openOptions() {
		if(showContextualOptions){
			dispatch("changeOptions", {
				widget: widget,
				state: state
			});
		}
	}

	// Auto refresh handler
	function reloadEvery(millis) {
		return new Promise((resolve, reject) => {
			_interval = setInterval(() => {
			if(sessionID !== null && sessionID !== window._gridSessionID){
				console.log("Remove interval...");
				clearInterval(_interval);
				_interval = null;
				resolve();
			}
			reloadWidget();
		}, millis);
		});
	}

	// Dispatch contextmenu
	function contextmenu(e) {
		if(disableContextMenu)
			e.preventDefault();
		dispatch("contextmenu", {e, ref: MAIN_REF});
	}

	// Get theme to use with the widget
	function _getTheme(theme) {
		if(properties.DARK_MODE_SUPPORTED)
			return `theme--${theme}`;
		return "theme--light";
	}

	// Get colors to use with the widget
	function _getColor(theme) {
		if(properties.DARK_MODE_SUPPORTED){
			return {
				background: properties.THEME[theme],
				text: properties.TEXT_COLOR[theme],
				background_dashboard: getBackground(theme),
				color_dashboard: getColor(theme),
				theme
			}
		}
		return {
			background: properties.THEME["light"],
			text: properties.TEXT_COLOR["light"],
			background_dashboard: getBackground("light"),
			color_dashboard: getColor("light"),
			theme: "light"
		}
	}

</script>

<IntersectionObserver 
	once 
	element={MAIN_REF} 
	root={parent} 
	bind:intersecting={isWidgetVisible}
	on:intersect={() => {		
		if(!isFirstObservation)
			return;
		isFirstObservation = false;
		loadWidget();
	}}
	>

	<main bind:this={MAIN_REF}>

		{#if properties}

			<!-- Main -->
			<main 
				class="{_getTheme(_theme)} pa-{padding}"
				style="background: {_getColor(_theme).background}"
				on:contextmenu={contextmenu}
			>

				<!-- Widget content -->
				<div class="content-widget pa-{padding}">
						
					<!-- Widget -->
					<div bind:this={WIDGET_REF}>

					</div>

				</div>

				{#if showOptionButton && showOptions}
					<div class="button-options">
						<Button icon size="x-small" on:click={() => {
							dispatch("changeOptions", {
								widget: widget,
								state: state
							});
						}}>
							<Icon path={mdiCog} />
						</Button>
					</div>
				{/if}

				<!-- Generic container -->
				{#if genericContainer}
					<div class="generic-container" style="background: {_getColor(_theme).background}" transition:blur="{{amount: 10}}">

						<!-- Content generic container -->
						<div class="content">

							<!-- Icon -->
							{#if genericContainer.hasOwnProperty("icon") && genericContainer.icon}
								<div class="icon">
									<Icon path={genericContainer.icon} size={64} />
								</div>
							{/if}

							<!-- Circle loading -->
							{#if genericContainer.hasOwnProperty("showCircleLoading") && genericContainer.showCircleLoading}
								<div class="icon">
									<ProgressCircular size={64} indeterminate color={"primary-color"} />
								</div>
							{/if}

							<!-- Circle loading -->
							{#if genericContainer.hasOwnProperty("showProgressBar") && genericContainer.showProgressBar && genericContainer.hasOwnProperty("progressBarValue")}
								<div class="icon">
									<ProgressLinear rounded height={"20px"} value={genericContainer.progressBarValue} color={"primary-color"}>
										<span class="white-text font-weight-bold">
											{genericContainer.progressBarValue}%
										</span>
									</ProgressLinear>
								</div>
							{/if}

							<!-- Text description -->
							{#if genericContainer.hasOwnProperty("text") && genericContainer.text}
								<div class="text text-center pl-1 pr-1">
									{genericContainer.text}
								</div>
							{/if}

							<!-- Action buttons -->
							{#if (genericContainer.hasOwnProperty("showReload")  && genericContainer.showReload) || (genericContainer.hasOwnProperty("showConfig")  && genericContainer.showConfig)}
								<div class="action">
									<div>
										{#if genericContainer.hasOwnProperty("showReload")  && genericContainer.showReload}
											<div>
												<Button class="primary-color white-text" block depressed size="small" on:click={reloadWidget}>
													Ricarica
												</Button>
											</div>
										{/if}
										<div>
										{#if showContextualOptions && genericContainer.hasOwnProperty("showConfig")  && genericContainer.showConfig && state}
											<Button class="primary-text" outlined block depressed size="small" on:click={() => {
												openOptions();
											}}>
												Configura
											</Button>
										{/if}
										</div>
									</div>
								</div>
							{/if}

						</div>

					</div>
				{/if}

			</main>

		{/if}

	</main>

</IntersectionObserver>

<style>

	/* Main */
	main {
		position: relative;
		width: 100%;
        height: 100%;
		overflow: hidden !important;
	}

	/* Widget space */
	.content-widget {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
		overflow: hidden;
	}

	:global(.content-widget > div) {
		width: 100%;
		height: 100% !important;
		overflow-y: auto;
	}

	/* Generic container */
	.generic-container {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 1;
		display: grid;
		place-items: center;
		user-select: none;
	}

	.generic-container > .content {
		width: 100%;
		max-width: 300px;
		height: auto;
	}

	.generic-container > .content > div {
		display: grid;
		place-items: center;
	}

	.generic-container > .content > .text {
		padding-top: 32px;
	}

	.generic-container > .content > .action {
		padding-top: 32px;
	}

	/* Button options */
	.button-options {
		position: absolute;
		top: 4px;
		right: 4px;
	}

</style>