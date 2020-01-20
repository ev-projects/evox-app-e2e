/**
 *  a Class dedicated on Validating variables.
 */
class Validator {

  /**
   * Checks if the Variable is not Empty,
   */
  isValid = (variable) => {
    if (variable != "" && (variable != null) && (variable != undefined)) {
      if (this.isNumeric(variable) && variable == 0) {
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Checks if the Variable is Number,
   */
  isNumeric = (variable) => {
    if (!isNaN(parseFloat(variable)) && isFinite(variable)) {
      return true;
    } else {
      return false;
    }
  }
}

export default new Validator();
