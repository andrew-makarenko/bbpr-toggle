// ==UserScript==
// @name BitBucket Pull Request Toggle Buttons
// @author Gordon Myers
// @version 0.5.1.3
// @match https://bitbucket.org/*/pull-request*
// ==/UserScript==


const currentPageId = btoa(window.location.pathname);

const loadState = () => {
	return new Promise(resolve => {
		chrome.storage.local.get(currentPageId, (data) => {
			console.log('loadState')
			resolve(Object.assign({ enabled: false }, data[currentPageId]));
		});
	});
};

const saveState = (data) => {
	return new Promise(resolve => {
		chrome.storage.local.set({
			[currentPageId]: data
		}, resolve);
	});
};


const waitForDiffContainer = () => {
	let tries = 0;
	return new Promise((resolve, reject) => {
		const interval = setInterval(() => {
			if (tries > 200) {
				clearInterval(interval);
				console.log('No diff container found tries', tries);
				reject();
			}
			tries++;
			const diff = document.querySelector('.diff-container');
			console.log('Diff loaded');
			if (diff) {
				clearInterval(interval);
				resolve();
			}
		}, 500);
	})
}


const ready = () => {
	return Promise.all([
		loadState(currentPageId),
		waitForDiffContainer()
	]);
};


ready().then(data => {
	const state = data[0];
	console.log('bbpr ready');
	var buttons = document.querySelector('#pullrequest-actions');
	if (!buttons) {
		console.log('no pullrequest-actions, exit');
		return;
	}

	var buttonContainer = document.createElement('div');
	buttonContainer.className = 'aui-buttons';
	buttonContainer.style.marginRight = '10px';

	var testButton = document.createElement('button');
	testButton.className = 'aui-button';
	testButton.innerHTML = 'Test this please';
	buttonContainer.appendChild(testButton);

	buttons.insertBefore(buttonContainer, buttons.childNodes[0]);

	testButton.addEventListener('click', function () {
		var text = document.querySelector('#id_new_comment');
		var submitButton = document.querySelector('.js-comment-button');
		text.innerText = 'test this please';
		submitButton.click();
	});

	var containers = document.getElementsByClassName('diff-container');
	for (var i = 0; i < containers.length; i++) {
		var container = containers[i];
		var filename = container.querySelector('.filename').innerText;

		var isHidden = state[filename] ? state[filename].toggled : false;
		if (filename.indexOf('__snapshots__') > -1) {
			isHidden = true;
		}
		var content = container.getElementsByClassName('refract-container');
		if (content.length == 0) {
			content = container.getElementsByClassName('diff-note');
		}
		if (content.length == 0) {
			content = container.getElementsByClassName('content-container');
		}
		content[0].style.display = isHidden ? 'none' : '';

		var actions = container.getElementsByClassName('diff-actions');
		if (actions[0] && content[0]) {
			var toggle = document.createElement('div');
			toggle.className = 'aui-buttons';
			toggle.innerHTML = '<button class="aui-button aui-button-light fr-toggle-button">Toggle</button>';
			actions[0].insertBefore(toggle, actions[0].childNodes[0]);
			toggle.addEventListener('click', function(evt) {
				evt = evt || window.event;
				var container = evt.srcElement || evt.target;
				while (!~container.className.indexOf('diff-container')) {
					container = container.parentNode;
					if (container.nodeType != 1) return;
				}
				var content = container.getElementsByClassName('refract-container');
				if (content.length == 0) {
					content = container.getElementsByClassName('diff-note');
				}
				if (content.length == 0) {
					content = container.getElementsByClassName('content-container');
				}
				var filename = container.querySelector('.filename').innerText;
				var isHidden = (content[0].style.display == 'none');
				content[0].style.display = isHidden ? '' : 'none';
				saveState(Object.assign(state, {
					[filename]: {
						toggled: !isHidden
					}
				}));
			});
		}
	}

});
