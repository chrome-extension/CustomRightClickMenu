﻿function doubleKey(key) {
	var result;
	key.forEach(function (item, index) {
		result = item * 2;
		key[index] = (result > 99 ? result - 99 : result);
	});
	return key;
}

function encrypt(target, key) {
	var i;
	var keys = [];
	var newTarget = {};
	for (key in target) {
		if (target.hasOwnProperty(key)) {
			keys.push({
				key: key,
				val: target[key]
			});
		}
	}

	var index;
	target.verified = true;
	var length = (keys.length * 2) - 2;

	index = Math.round(Math.random() * keys.length - 1);
	newTarget[keys[index].key] = keys[index].val;

	for (i = 0; i < length; i++) {
		newTarget[Math.round(Math.random() * 10000)] = Math.round(Math.random() * 10000);
		index = Math.round(Math.random() * keys.length - 1);
		newTarget[keys[index].key] = keys[index].val;
	}

	key = doubleKey(key);
	target = JSON.stringify(newTarget);

	var j = 0;
	var charcodes = [];
	length = target.length;
	for (i = 0; i < length; i++, j++) {
		if (j > 25) {
			key = doubleKey(key);
			j = 0;
		}
		charcodes[i] = target.charCodeAt(i) ^ key[j];
	}
	return charcodes;
}

function decrypt(target, key) {
	var keyCopy = [];
	key.forEach(function (item, index) {
		keyCopy[index] = item;
	});
	console.log(key);
	key = doubleKey(key);

	var i;
	var j = 0;
	var results = [];
	for (i = 0; i < target.length; i++, j++) {
		if (j > 25) {
			key = doubleKey(key);
			j = 0;
		}
		results[i] = String.fromCharCode(target[i] ^ key[j]);
	}
	results = results.join('');
	console.log(results);
	try {
		results = JSON.parse(results);
		var equal = true;
		keyCopy.forEach(function (item, index) {
			if (item !== results.secretKey[index]) {
				console.log(item, results.secretKey[index]);
				equal = false;
				return false;
			}
		});
		if (results.verified && equal) {
			return results;
		}
		return false;
	} catch (e) {
		return false;
	}
}