import React, { useState, useEffect, useRef } from 'react';
import { connect,useDispatch } from 'react-redux';
import PoliciesDocumentModal from './PoliciesDocumentModal';
import { Table } from "react-bootstrap";
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import JSZip from 'jszip';
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
  import PoliciesDocumentViewer from './PoliciesDocumentViewer';
  import "./PoliciesDocumentUpload.css";
  import {
    fecthUserContry,fecthUserDepartment
  } from "./PoliciesDocumentApi.js";
const PoliciesDocumentDownload = (props) => {
  const dispatch = useDispatch();
    const { user, usercountry,policiesdocument,userdepartment } = props;
    const [files, setFiles] = useState([]);
    const [vlaidatecountry, setValidateCountry] = useState(false);
    const [isindex, setIndex] = useState(false);
    const [isId, setId] = useState(false);
    const [vlaidatedepartment, setValidateDepartment] = useState(false);
    const [countryid,setCountryId] = useState(0);
    const [selectedOption, setSelectedOption] = useState('Global');
    const [radiovalidation, setRadioValidation] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
      GlobalType: 1,
      CountryId:user.country_id,
      DepartmentId:[],
      selectedDepartments:"All"
  });
    // Function to open the modal
     const openModal = () => setIsModalOpen(true);

    // Function to close the modal
    const closeModal = () => {
      setId(false);
      setIsModalOpen(false);
      dispatch({'type': 'CLEAR_MY_POLICY_DOC'})
    }

    const handleviewer = (pos, id)=>{
      setIndex(pos);
      setId(id);
      openModal();
    }

  useEffect(() => {
    // dispatch(fecthUserContry(1));
    // dispatch(fecthUserDepartment(1,0,1));
   
    handleFilter();
  }, []);


      // Function to handle the file download
      const downloadBase64File = (base64String, fileName) => {
        // Create a link element
        const link = document.createElement('a');
        
        // Set the href attribute to the Base64 string (data URL)
        link.href = base64String;
        
        // Set the download attribute to specify the file name
        link.download = fileName;
        
        // Programmatically trigger the download by clicking the link
        link.click();
      };


  const handleChange = (e) => {

    // if(e.target.name === "GlobalType"){
    //   setSelectedOption(e.target.value);
    //   if(e.target.value === "Geo"){
    //     setRadioValidation(false);
    //     setFormData({
    //       ...formData,
    //       [e.target.name]: 0,
    //     });
    //   }else{
    //     setValidateCountry(false);
    //     setRadioValidation(true);
    //     setFormData({
    //       ...formData,
    //       [e.target.name]: 1,
    //       ["CountryId"]: 0,
    //     });
    //   }
    // }else{

    if( e.target.value == 0){
      
      setFormData({
        ...formData,
        ["GlobalType"]: 1,
        ["CountryId"]: 0,
        ["DepartmentId"]:[],
        ["selectedDepartments"]: "All",
      });
      dispatch(fecthUserDepartment(1,0,1));
    }else{
      
      setFormData({
        ...formData,
        ["GlobalType"]: 0,
        ["CountryId"]: e.target.value,
        ["DepartmentId"]:[],
        ["selectedDepartments"]: "All",
      });
      dispatch(fecthUserDepartment(0,e.target.value,1));
    }

          setValidateCountry(false);
    // }

    // if(e.target.name === "GlobalType"){
    //   setSelectedOption(e.target.value);
    //   if(e.target.value === "Geo"){
    //     setRadioValidation(false);
    //   }else{
    //     setRadioValidation(true);
    //     setCountryId(0);
    //   }
    // }else{
    //       setCountryId(e.target.value);
    //       setValidateCountry(false);
    // }
   
  }

  const handleChange1 = (selectedList) => {
    
    const isSelectAll = selectedList.length === userdepartment.length;

    setFormData({
      ...formData,
      ["DepartmentId"]: selectedList,
      ["selectedDepartments"]: isSelectAll ? "All" : Formatter.array_to_getvalue(selectedList).toString(),
    });
      setValidateDepartment(false);
  };

  const handleChange2 = (e) => {
    


    setFormData({
      ...formData,
      ["DepartmentId"]: e.target.value,
      ["selectedDepartments"]: e.target.value,
    });
      setValidateDepartment(false);
  };

        const handleDownloadAll = () => {
         
      
          const zip = new JSZip();  
          
          // Fetch files and add them to the zip
          policiesdocument.forEach(url => {
            // Using fetch API to get the file and convert it to blob
            fetch(url.FileData)
              .then(response => response.blob())  // Convert response to blob
              .then(blob => {
                const fileName = url.FileName; // Get file name from URL
                zip.file(fileName, blob); // Add the file to zip
              })
              .catch(err => console.error('Error fetching file:', err));
          });
      
          // After all files are added to the zip, generate the ZIP file and trigger download
          setTimeout(() => {
            zip.generateAsync({ type: 'blob' })
              .then(content => {
                // Create a download link for the zip file
                const link = document.createElement('a');
                link.href = URL.createObjectURL(content);
                link.download = 'PoliciesDocuments.zip'; // Set the file name for the zip file
                link.click(); // Trigger the download
              });
          }, 1000); // Adjust time as needed, depending on the file size or network delay
        };

  const handleFilter = async() => {
  // if(formData.GlobalType === 0 && formData.CountryId === 0){
  //   setValidateCountry(true);
  // }else{
    await API.call({
      method: "get",
      url: `/show`,
      params: formData
    })
      .then((result) => {
        dispatch({
          type: 'FETCH_MY_POLICIES_DOC',
          data: result.data, // Ensure you're dispatching the correct data structure
        });
      })
      .catch((e) => {
        dispatch(Formatter.alert_error(e));
      });
  // }
 
  }

    return (
      <div>
      <Wrapper>
          <ContainerBody>
          <Content col="12" label="Create Room">
            
            <div className='heading-style'>
            <h3 className='download-header'>Download Policies Document</h3>
            </div>  



            <div style={{ overflowY: 'auto',padding: '0px 33px', fontSize: '14px' }}>
      <Table striped bordered hover tableheader>
      {policiesdocument && policiesdocument.length > 0 ?
      <thead>
          <tr>

        <th>Sno</th>
        <th>Title</th>
        <th>Geo</th>
        <th>Department</th>
        <th colspan="1" style={{"textAlign":"center"}}>Action</th>
        </tr>
      </thead>
      :""
}
      <tbody>
      {policiesdocument && policiesdocument.length > 0 ?
                          policiesdocument.map((file,pos) => {
                            let link = '';
                            switch (file.FileExtension) {
                              case "csv":
                                link = "/images/excel.png";
                                break;
                              case "xlsx":
                                link = "/images/excel.png";
                                break;
                              case "docx":
                                link = "/images/doc.png";
                                break;
                              case "pdf":
                                link = "/images/pdf.png";
                                break;
                                case "png":
                                link = "/images/img.png";
                                break;
                                case "jpg":
                                link = "/images/img.png";
                                break;
                                case "jpeg":
                                link = "/images/img.png";
                                break;
                              default:
                                link = ''; // Handle the default case if needed
                            }
                            return (
                              
              

                  <tr>
                  <td>{pos+1}</td>
                  {/* <td><img src={link} className='back-img'></img></td> */}
                  <td className='tdcontent'><img src={link} className='back-img'></img><span>{file.Title}</span></td>
                  <td >{file.IsGlobal == 1 ? "Global" : user.country }  </td>
                  <td >{file.Name}  </td>
                  {/* <td style={{"textAlign":"center"}}><button  class="download-btn" onClick={() => downloadBase64File(file.FileData, file.FileName)}><i class="fa fa-download" aria-hidden="true"></i></button></td> */}
                  <td style={{"textAlign":"center"}}><button  class="download-btn" onClick={() => handleviewer(pos, file.Id)}><i class="fa fa-eye" aria-hidden="true"></i></button></td>
                  </tr>

                          )}) : <tr><td colSpan="3" className='notfound'><h4><img src="/images/nodata.png" className='back-img'></img> No Document Found</h4></td></tr> }
  </tbody>
  </Table>
  </div>



            
            {/* <Row>
            <Col size="12">
            <Row> */}
            {/* <Col size="4">
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
            <Col size="4">
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
          
            </Col> */}

            {/* <Col size="6">
            <div className="form-group">
            <select
                        className="form-control" 
                        name="CountryId"
                        value={formData.CountryId}
                        onChange={handleChange}
                        style={{ display: 'block' }}>
                        <option  value = {0}  label="Global" />
                        {usercountry && usercountry.length > 0 &&
                          usercountry.map((country, pos) => (
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
            </div>

            </Col> */}

            {/* <Col size="6">
          <div className="form-group multi-item-height"> */}
          {/* <MultiSelect
                              name="department"
                              options={userdepartment && userdepartment.length > 0 ?(Formatter.array_to_multiselect_array(userdepartment, 'DepartmentName', 'Id')) : []}
                              value={formData.DepartmentId}
                              onChange={handleChange1}
                              labelledBy={"Select Departments"}
                              hasSelectAll = {true}
                              className='item-height' />
                                   {vlaidatedepartment && (
                        <label style={{ color: "red" }}>
                          Please Select Department
                        </label>
                      )} */}
                       {/* <select
                        className="form-control" 
                        name="department"
                        value={formData.DepartmentId}
                        onChange={handleChange2}
                        style={{ display: 'block' }}>
                        <option  value = {"All"}  label="Select Department" />
                        {userdepartment && userdepartment.length > 0 &&
                          userdepartment.map((dept, pos) => (
                            <option value={dept.Id}>
                              {dept.DepartmentName}
                            </option>
                          ))}
                      </select> */}
                      {/* {vlaidatedepartment && (
                        <label style={{ color: "red" }}>
                          Please Select Department
                        </label>
                      )} */}
                            {/* </div> */}
                       
                            {/* </Col>
                            </Row>
                            <Row> */}
            {/* <Col size="12" >
                  <div className="form-group">
                    <button onClick={handleFilter} className="btn btn-primary col-btn-css btn-space" ><i class="fa fa-filter" aria-hidden="true"></i> Filter</button>
                  </div>
                </Col> */}
               
            {/* </Row>
            </Col>  
            </Row> */}
             {/* {policiesdocument && policiesdocument.length > 0 && <button onClick={handleDownloadAll} className="btn btn-primary col-btn-css" style={{marginTop: "13px"}}><i class="fa fa-download" aria-hidden="true"></i> Download All as ZIP</button> }  */}
              </Content>
              </ContainerBody>
              </Wrapper>

              {isId && policiesdocument && 
               <PoliciesDocumentViewer isOpen={isModalOpen} closeModal={closeModal} policiesdocument={policiesdocument} index={isindex} id={isId} />
              }
              {/* <PoliciesDocumentModal isOpen={isModalOpen} closeModal={closeModal} policiesdocument={policiesdocument} /> */}
              </div>
              
    )
  }
  const mapStateToProps = (state) => {
    return {
      user: state.user,
      usercountry: state.dashboard.my_country,
      policiesdocument: state.dashboard.my_doc,
      userdepartment: state.dashboard.my_department,
    };
  };
export default connect(mapStateToProps)(PoliciesDocumentDownload);
  