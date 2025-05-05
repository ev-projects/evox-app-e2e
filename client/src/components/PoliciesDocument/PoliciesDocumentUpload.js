import React, { useState, useEffect, useRef } from 'react';
import { connect,useDispatch } from 'react-redux';
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import MultiSelect from "react-multi-select-component";
import {
    ContainerHeader,
    Content,
    ContainerWrapper,
    ContainerBody,
    Row,
    Col,
  } from "../../components/GridComponent/AdminLte.js";
  import Wrapper from "../Template/Wrapper";
  import "./PoliciesDocumentUpload.css";
  import {
    fecthUserContry,fecthUserDepartment
  } from "./PoliciesDocumentApi.js";
 
function PoliciesDocumentUpload(props) {
    const dispatch = useDispatch();
    const { user, usercountry, userdepartment, countries } = props;
    const [files, setFiles] = useState([]);
    const [invalidfiles, setinvalidFiles] = useState([]);
    const [vlaidatefiles, setValidateFiles] = useState(false);
    const [vlaidatecountry, setValidateCountry] = useState(false);
    const [validatetitle, setValidateTitle] = useState(false);
    const [vlaidatedepartment, setValidateDepartment] = useState(false);
    const [inputKey, setInputKey] = useState(0);
    const [formData, setFormData] = useState({
        FileData:[],
        GlobalType:'',
        CountryId:0,
        DepartmentId:[],
        selectedDepartments:"",
        title:""
    });
  
    const fileInputRef = useRef(null);
    const [selectedOption, setSelectedOption] = useState('Global');
    const [radiovalidation, setRadioValidation] = useState(true);

    useEffect(() => {
      dispatch(fecthUserContry(0));
      dispatch(fecthUserDepartment(1,0,0));
    }, []);

    const removeFile = (fileToRemove) => {
      setFiles(prevFiles => prevFiles.filter(file => file !== files[fileToRemove]));
      setInputKey((prevKey) => prevKey + 1); 
    };

  // Display the selected file names
  const renderFileList = () => {
    return Array.from(files).map((file, index) => (
      // <li key={index}>
      //   {file.name} 
      //   <span>
          // <button 
          //   type="button"
          //   className='removebtn'
          //   onClick={() => removeFile(index)}
          // >
          //   <i className="fa fa-times" aria-hidden="true"></i>
          // </button>
      //   </span>
      // </li>

      <tbody key={index}>
        <tr className='rendertd'>
            <td>{index + 1}. </td>
            <td style={{width:"90%"}}>{file.name} </td>
            <td>    
              <button 
                type="button"
                className='removebtn'
                onClick={() => removeFile(index)}
              >
              <i className="fa fa-times" aria-hidden="true"></i>
              </button>
            </td>
        </tr>
      </tbody>
    ));
  };

  const renderFileList1 = () => {
    return Array.from(invalidfiles).map((file, index) => (
      <li key={index}>{file.name} </li>
    ));
  };

  const handleUpload = async (e) => {
    e.preventDefault(); 
    console.log(userdepartment[0].Id);
    console.log(formData.DepartmentId)
    if (files.length === 0 && (formData.GlobalType === 'Geo' && formData.CountryId === 0)) {

      setValidateFiles(true);
      setValidateCountry(true);
    }else if(files.length === 0){

      setValidateFiles(true);
    }else if(formData.GlobalType === 'Geo' && formData.CountryId === 0){
     
      setValidateCountry(true);
    }else if(!userdepartment[0].Id){
      setValidateDepartment(true);
    }else if(e.target.title.value === '') {
      setValidateTitle(true);
    }
    else{

  const formData1 = new FormData();
  files.forEach((file) => {
    formData1.append('FileData[]', file); 
  });
 
  formData1.append('GlobalType', formData.GlobalType == 'Geo' ? 0 : 1);
  formData1.append('CountryId', formData.CountryId);
  formData1.append('selectedDepartments', userdepartment[0].Id);
  formData1.append('title', formData.title);
  



    // try {
    //   const response = await axios.post('http://127.0.0.1:8000/api/uploadfiles', formData1, {
    //     headers: {
    //       'Content-Type': 'multipart/form-data',
    //     },
    //   });
    //   alert(response.data.message);
    // } catch (error) {
    //  alert(error);
    // }

    try {
      API.call({
          method: "post",
          url: "/uploadfiles",
          data: formData1,
      })
      .then(result => {
          dispatch( Formatter.alert_success( result, 3000 ));
          setFiles([]);
          setSelectedOption('Global');
          setRadioValidation(true);
          fileInputRef.current.value = '';
          setinvalidFiles([]);
          setValidateTitle(false);
          setFormData({
            ...formData,
            ["FileData"]: [],
            ["GlobalType"]: '',
            ["CountryId"]: 0,
            ["DepartmentId"]:[],
            ["selectedDepartments"]:'',
            ["title"]:''
          });

      })
      .catch(e => {
          dispatch( Formatter.alert_error( e ) ) 
      });
  } catch (error) {
    console.error("Error submitting dispute:", error);
  }


  }
  };

 

  const handleChange = (e) => {
    if(e.target.name === "FileData"){
      setValidateFiles(false);
     
      // setFiles([]);
      const selectedFile = e.target.files[0];
      // const selectedFiles = e.target.files;
      const newFiles = Array.from(e.target.files);

      // Ensure selectedFiles is an array before calling .some() on it
      if (!Array.isArray(files)) {
        console.error('selectedFiles is not an array:', files);
        return;
      }
      setinvalidFiles([]);
      // Filter out files that are already in the selectedFiles list
        const uniqueFiles = newFiles.filter((file) => {
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'docx', 'pdf'];
      // Check if the file has an allowed extension
        const fileExtension = file.name.slice(((file.name.lastIndexOf('.') - 1) >>> 0) + 2).toLowerCase();
        const isValidExtension = allowedExtensions.includes(`${fileExtension}`);
      // Return false (filter out) if file extension is not allowed
        if (!isValidExtension) {

          setinvalidFiles((prevFiles) => [...prevFiles, file]);
      
          console.warn(`File ${file.name} is not a valid extension.`);
          return false;  // Skip this file
        }

      // Ensure the file is not already in the selectedFiles list
      return !files.some(
      (existingFile) => existingFile.name === file.name && existingFile.size === file.size
      );
      });

      console.log(uniqueFiles);

      // Update the state with the unique files
      setFiles((prevFiles) => [...prevFiles, ...uniqueFiles]);
          // setFiles((prevFiles) => [...prevFiles, ...Array.from(selectedFiles)]);
      // Define the allowed extensions


      // if (selectedFile) {
      //   const fileExtension = selectedFile.name.split('.').pop().toLowerCase();  // Extract extension and convert to lowercase
      //   const savemultifile = [];
      //   // Check if the file extension is in the allowed list
      //   if (allowedExtensions.includes(fileExtension)) {
      //     setFormData({
      //         ...formData,
      //         [e.target.name]: savemultifile,
      //       }); 
      //   } else {
      //     setFormData({
      //         ...formData,
      //         [e.target.name]:"",
      //       }); 
      //       // setFiles([]);
      //       fileInputRef.current.value = '';
      //     alert('Invalid file type. Only JPG, JPEG, PNG, DOCX, PDF, XLSX files are allowed.');
      //   }
      // }
    }else if(e.target.name === "GlobalType"){
     
      setSelectedOption(e.target.value);
      if(e.target.value === "Geo"){
        setRadioValidation(false);
        setFormData({
          ...formData,
          [e.target.name]: e.target.value,
          ["DepartmentId"]:[],
          ["selectedDepartments"]:''
        });
      
      }else{
        setRadioValidation(true);
        setFormData({
          ...formData,
          [e.target.name]: e.target.value,
          ["CountryId"]: 0,
          ["DepartmentId"]:[],
          ["selectedDepartments"]:''
        });

        dispatch(fecthUserDepartment(1,0,0));
      }
    }else if(e.target.name === "title"){
        setFormData({
          ...formData,
          [e.target.name]: e.target.value,
          ["DepartmentId"]:[],
          ["selectedDepartments"]:''
        });
    }else{
     
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
            ["DepartmentId"]:[],
            ["selectedDepartments"]:''
          });

          setValidateCountry(false);
          dispatch(fecthUserDepartment(0,e.target.value,0));
    }
   console.log(files);
  }

  return (
    <div>
    <Wrapper>
      <ContainerWrapper>
        <ContainerBody>
        <Content col="6" label="Create Room">
          <form onSubmit={handleUpload}>
          <div className='heading-style'>
          <h3>Upload Policies Document</h3>
          </div>  
          <Row>
          <Col size="12">
          <Row>
          <Col size="12">
          <div className="form-group">
          <Row>
          <Col size="2">
          <div className="form-group">
          <label>          
                      <input 
                        name= "GlobalType" 
                        type="radio"
                        value="Global"
                        checked={selectedOption === 'Global'}
                        onChange={handleChange}
                      /> 
                    Global &nbsp;</label>
                    </div>
          </Col>
          <Col size="2">
          <div className="form-group">
          <label>          
                      <input 
                        name= "GlobalType" 
                        type="radio"
                        value="Geo"
                        checked={selectedOption === 'Geo'}
                        onChange={handleChange}
                      /> 
                    Geo &nbsp;</label>
            </div>
          </Col>
          </Row>
          <Row>
          <Col size="12">
          <div className="form-group">
          <select
											className="form-control" 
											name="CountryId"
                      disabled = {radiovalidation}
                      value={formData.CountryId}
                      onChange={handleChange}
											style={{ display: 'block' }}>
										  <option  value = {0}  label="Select Country" />
                      {countries && countries.length > 0 &&
                        countries.map((country, pos) => (
                          <option value={country.country_id}>
                            {country.country_name}
                          </option>
                        ))}
										</select>
                    {vlaidatecountry && (
                      <label style={{ color: "red" }}>
                        Please Select Country
                      </label>
                    )}

              <input
                type="hidden"
                className="form-control"
                name='department'
                value={user.department}
                disabled = {true}
              />
          </div>
          </Col>
          {/* <Col size="6">
          <div className="form-group multi-item-height"> */}

                  

          {/* <MultiSelect
                              name="department"
                              options={userdepartment && userdepartment.length > 0 ?(Formatter.array_to_multiselect_array(userdepartment, 'DepartmentName', 'Id')) : []}
                              value={formData.DepartmentId}
                              onChange={handleChange1}
                              labelledBy={"Select Departments"}
                              hasSelectAll = {false}
          /> */}
           {/* {vlaidatedepartment && (
                      <label style={{ color: "red" }}>
                        Please Select Department
                      </label>
                    )} */}
                            {/* </div>
                            </Col> */}
          
          <Col size="12">
            <div className="form-group">
            <input
                    type="text"
                    placeholder="Title"
                    className="form-control"
                    name='title'
                    value={formData.title}
                    onChange={handleChange}
                  />
            {validatetitle && (
              <label style={{ color: "red" }}>
                Please provide a proper title for this document.
              </label>
            )}
            </div>
          </Col>
                            
          </Row>

          <input 
          id="drop-area"
          ref={fileInputRef}
          key={inputKey}
          className="form-control upload_files"
          name= "FileData" 
          type="file" 
          multiple 
          onChange={handleChange} />
          {/* <span className="icon-stack">Drag & Drop</span> */}
            {vlaidatefiles && (
                      <label style={{ color: "red" }}>
                        Please choose a valid file (pdf, doc, jpg, jpeg, png)
                      </label>
                    )}
            {
              <ul className='mt-3 invalid'>
                {invalidfiles.length > 0 && (<dt>Invalid Format List</dt>) }
                {invalidfiles.length > 0 && renderFileList1()}
              </ul>
            }        
          </div>
          </Col>
          </Row>
          
          </Col>  
       
          <Col size="12">
          <ul className='list_style'>
            {renderFileList()}
          </ul>
          </Col> 
      
          <Col size="12">
                <div className="form-group">
                  <button type="submit" className="btn btn-primary col-btn-css" >Upload</button>
                </div>
              </Col>
         
          </Row>
         
        
            </form>
            </Content>
            </ContainerBody>
            </ContainerWrapper>
            </Wrapper>
            </div>
  )
}
const mapStateToProps = (state) => {
  return {
    user: state.user,
    usercountry: state.dashboard.my_country,
    userdepartment: state.dashboard.my_department,
    countries: state.settings.countries
  };
};
export default connect(mapStateToProps)(PoliciesDocumentUpload)