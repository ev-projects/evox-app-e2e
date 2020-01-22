class Formatter {

  merge_json(first_obj, second_obj) {
    for (var key in second_obj) {
      first_obj[key] = second_obj[key];
    }
    return first_obj;
  }
  
}

export default new Formatter();
