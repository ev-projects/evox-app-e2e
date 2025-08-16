/**
 *  A dedicated Reducer for User State
 */

const initState = {
    isInstanceLoaded: false,
    instance: {},
}

const coeReducers = (state = initState, action) => {
    let message = "";
    let result = {...state};
    switch(action.type) {
        /**
         *  Logout Actions
         */
        case "FETCH_COE_SUCCESS":
            return {
                instance : action.coe,
                isInstanceLoaded : true
            };
            break;
        case "REQUEST_COE_SUCCESS":
            var fileURL = window.URL.createObjectURL(new Blob([action.data], {
                type: "application/pdf"
              }));
            var fileLink = document.createElement('a');
            fileLink.href = fileURL;
            fileLink.setAttribute('download', action.filename);
            document.body.appendChild(fileLink);
            fileLink.click();
            return result;
            break;
        default:
            result = state;
    }
    return result;
}

export default coeReducers;