import React, { useState, useEffect, useRef } from 'react';
import Modal from "react-bootstrap/Modal";
import "bootstrap/dist/css/bootstrap.min.css";
import JSZip from 'jszip';
import { connect,useDispatch } from 'react-redux';
import { Row, Form, Button, Col, Collapse, Container, Overlay, Popover,Table } from "react-bootstrap";
import "./PoliciesDocumentUpload.css";
import ReactFileViewer from 'react-file-viewer';
import { fetchPolicyDocument } from "./PoliciesDocumentApi.js";
import PageLoadingCard from "../../container/PageLoadingCard.js/PageLoadingCard.js";

const PoliciesDocumentViewer = ({ isOpen, closeModal, policiesdocument, index, id, policydocument = {FileData: null, FileName: null, FileExtension: null, FileType: null} } ) => {

     const [totalcount, setTotalCount] = useState(0);
     const [curindex, setCurIndex] = useState(0);
     const [policy, setPolicy] = useState(0);
     const dispatch = useDispatch();

      useEffect(() => {
        setTotalCount(policiesdocument.length);
        setCurIndex(index);
        dispatch(fetchPolicyDocument(id));
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

    //   const handleviewer = (pos)=>{

    //     if(pos === 0){

    //         if(curindex > 0){
    //             setCurIndex(curindex - 1);
    //         }

    //     }else{

    //         if(curindex < totalcount){
    //             setCurIndex(curindex + 1);
    //         }

    //     }

    //     alert(curindex);

    //   }

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


  if (!isOpen) return null;
  return (
    <Modal
    show={isOpen}
    onHide={closeModal}
    aria-labelledby="contained-modal-title-vcenter"
    size="xl"
    fullscreen="xl-down"
    animation={true}
    className="custom-modal"
  >

    {/* {loader && <PreLoader />} */}
    <Modal.Header closeButton={closeModal} className='close-modal'>
      <Modal.Title id="contained-modal-title-vcenter" className='header-modal'>
      {/* {policiesdocument[index].FileName} */}
      View Documents
      </Modal.Title>
    </Modal.Header>
    
    {/* <button class="download-btn col-btn-css" onClick={() => handleviewer(0)}><i class="fa fa-arrow-left" aria-hidden="true"></i></button>
    <button class="download-btn col-btn-css" onClick={() => handleviewer(1)}><i class="fa fa-arrow-right" aria-hidden="true"></i></button> */}
    <Modal.Body className="show-grid bd-border" >
    <button className="btn btn-primary col-btn-css" onClick={() => downloadBase64File(policydocument?.FileData, policydocument?.FileName)}><i class="fa fa-download" aria-hidden="true"></i> Download</button>
      {policydocument.FileExtension ?
        (<Container className='fix'>
          <div style={{ maxHeight: '800px'}} className={policydocument?.FileExtension === 'xlsx' ? 'doc' : policydocument?.FileExtension === 'csv' ? 'doc' :""}>
            {policydocument?.FileExtension === 'pdf' || policydocument?.FileExtension === 'png' || policydocument?.FileExtension === 'jpg'|| policydocument?.FileExtension === 'jpeg'
              ? <iframe
                src={`${policydocument?.FileData}`}
                width="100%"
                height="650px"
                title="Zoho Viewer"
                style={{ border: "none" }}
              /> : policydocument?.FileExtension === 'pdf' ?


              //       <Viewer
              //   fileUrl={`${policiesdocument[index].FileData}`}
              //   plugins={[
              //     // Register plugins
              //     defaultLayoutPluginInstance,
              // ]}
              //   /> :
              <object data={policydocument?.FileData} type="application/pdf" width="100%" height="440%">
              </object> :

              <ReactFileViewer
                fileType={policydocument?.FileExtension} // 'pdf', 'docx', 'xlsx', 'csv', 'jpg', 'png'
                filePath={policydocument?.FileData}  // URL or Base64 string of the file
              />
            }
          </div>            
        </Container>)
       : (<PageLoadingCard/>)}
    </Modal.Body>
    </Modal>
  )
};


const mapStateToProps = (state) => {
    return {
      user: state.user,
      policiesdocument: state.dashboard.my_doc,
      policydocument: state.dashboard.my_doc_file,
    };
  };

export default connect(mapStateToProps)(PoliciesDocumentViewer);