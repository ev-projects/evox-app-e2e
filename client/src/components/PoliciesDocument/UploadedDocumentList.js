import React, { useState, useEffect, useRef } from 'react';
import { connect,useDispatch } from 'react-redux';
import { Table,Badge } from "react-bootstrap";
import API from "../../services/API";
import Formatter from "../../services/Formatter";
import JSZip from 'jszip';
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
    fecthUserDepartment
  } from "./PoliciesDocumentApi.js";
const UploadedDocumentList = (props) => {
  const dispatch = useDispatch();
    const { user,policiesdocument,userdepartment } = props;
    const [isindex, setIndex] = useState(false);
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
    const closeModal = () => setIsModalOpen(false);

    const handleviewer = (pos)=>{
      setIndex(pos);
      openModal();
    }

  useEffect(() => {
  
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
  const handleupdatestatus = async(id,status) => {

    let docstatus = 0;
    if(status === "1"){
      docstatus = 0;
    }else{
      docstatus = 1;
    }
    await API.call({
      method: "put",
      url: `/updatestatus/${id}/${docstatus}`,
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

  }

  const handleFilter = async() => {

    await API.call({
      method: "get",
      url: `/showlist`,
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

 
  }

    return (
      <div>
      <Wrapper>
        <ContainerWrapper>
          <ContainerBody>
          <Content col="12" label="Create Room">
            
            <div className='heading-style'>
            <h3>Manage Policy Accessibility</h3>
            </div>  



            <div style={{ maxHeight: '450px', overflowY: 'auto',padding: '0px 33px', fontSize: '14px' }}>
      <Table striped bordered hover tableheader>
      {policiesdocument && policiesdocument.length > 0 ?
      <thead>
          <tr>

        <th>Sno</th>
        <th>Title</th>
        <th>Geo</th>
        <th>Department</th>
        <th>Status</th>
        <th style={{"textAlign":"center"}}>Action</th>
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
                  <td className='tdcontent'><img src={link} className='back-img'></img><span>{file.Title}</span></td>
                  <td >{file.countryname}</td>
                  <td >{file.Name}  </td>
                  <td className="emp-status"> <Status status={file.IsActive} /></td>
                  <td style={{"textAlign":"center"}}><button  className="btn btn-primary " onClick={() => handleupdatestatus(file.Id,file.IsActive)}
                    >{file.IsActive == 0 ? "Click to activate" : "Click to deactivate"}</button></td>
                  </tr>

                          )}) : <tr><td colSpan="3" className='notfound'><h4><img src="/images/nodata.png" className='back-img'></img> No Document Found</h4></td></tr> }
  </tbody>
  </Table>
  </div>



             
              </Content>
              </ContainerBody>
              </ContainerWrapper>
              </Wrapper>


              </div>
              
    )
  }

  const Status = (props) => {
    let status = [];
    switch( props.status ) { 
      case "1":
          status.push( <Badge variant="success">Active</Badge>);
          break;
      case "0":
          status.push(<Badge variant="danger">Inactive</Badge>);
          break;
   }
    return status;
}
  const mapStateToProps = (state) => {
    return {
      user: state.user,
      usercountry: state.dashboard.my_country,
      policiesdocument: state.dashboard.my_doc,
      userdepartment: state.dashboard.my_department,
    };
  };
export default connect(mapStateToProps)(UploadedDocumentList);
  