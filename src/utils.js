/**
 * Counts word in a text
 * @param text 
 */
export function count(text){ //taken from https://stackoverflow.com/questions/18679576/counting-words-in-string 
    return !text.trim() ? 0: text.trim().split(/\s+/).length;
}

/**
 * Returns sum of elements in array
 * @param {*} array 
 */
export function sum(array){
    return array.reduce(function(a,b){
        return a + b
      }, 0);
}

