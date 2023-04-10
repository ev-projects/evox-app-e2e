import APICALL from "../../services/APICALL.js";
import Formatter from "../../services/Formatter";

export const FecthJobdetails = (setJobdetails) => {
  return async (dispatch, getState) => {
    await APICALL.call({
      method: "get",
      url: `/PostedJobs?Category=ALL&Location=ALL&KeyWord=ALL&ContractType=ALL`,
    })
      .then((result) => {
        setJobdetails(result.data);
        dispatch({
          type: "SET_REDIRECT",
          link: global.links.dashboard,
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  };
};

export const ApplyReferaljob = (
  jobid,
  fName,
  Mname,
  lName,
  Nname,
  email,
  MobileNumber,
  Address,
  City,
  myFile,
  referal_id
) => {
  return async (dispatch, getState) => {
    await APICALL.call({
      method: "post",
      url: "/PostCandidate",
      data: {
        Jobid: jobid,
        FirstName: fName,
        MiddleName: Mname,
        LastName: lName,
        NickName: Nname,
        Email: email,
        MobileNo: MobileNumber,
        Address: Address,
        City: City,
        HowDoHear: "Null",
        Acknowledge: "1",
        Resume: myFile,
        ReferedBy:referal_id
      },
    })
      .then((result) => {
    
        console.log(result);
        let response = {data: 
            {status: result.status, message: result.data},
            status: 200,
            statusText
            : 
            "OK"}
        dispatch(Formatter.alert_success(response, 3000));
        
      })
      .catch((e) => {
        try {
            if (e.status == "400" && e.data === "Seems you have applied for this job , Our team will contact you.") {
                let response = {data: 
                    {status: e.status, message: e.data},
                    status: 200,
                    statusText
                    : 
                    "OK"}
                    dispatch(Formatter.alert_success(response, 3000));
            }else{
                dispatch(Formatter.alert_error(e));
            }
          } catch (error) {
            dispatch(Formatter.alert_error(e));
          }
      });
  };
};
