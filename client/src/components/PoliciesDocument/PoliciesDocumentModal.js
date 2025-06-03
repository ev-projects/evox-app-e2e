import React, { useState } from 'react';
import Modal from "react-bootstrap/Modal";
import "bootstrap/dist/css/bootstrap.min.css";
import JSZip from 'jszip';
import { connect,useDispatch } from 'react-redux';
import { Row, Form, Button, Col, Collapse, Container, Overlay, Popover,Table } from "react-bootstrap";
import "./PoliciesDocumentUpload.css";
import PoliciesDocumentViewer from './PoliciesDocumentViewer';
const PoliciesDocumentModal = ({ isOpen, closeModal, policiesdocument} ) => {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isindex, setIndex] = useState(false);

    // Function to open the modal
    const openModal = () => setIsModalOpen(true);

    // Function to close the modal
    const closeModal1 = () => setIsModalOpen(false);


    const handleviewer = (pos)=>{
      setIndex(pos);
      openModal();
    }


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
    fullscreen="lg-down"
    animation={true}   
  >
    {/* {loader && <PreLoader />} */}
    <Modal.Header closeButton={closeModal} className='close-modal'>
      <Modal.Title id="contained-modal-title-vcenter" className='header-modal'>
         Download Documents
      </Modal.Title>
    </Modal.Header>
    <Modal.Body className="show-grid body-modal" >
      <Container>
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
      <Table striped bordered hover tableheader>
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
                  <td className='tdcontent'><img src={link} className='back-img'></img> <span>   {file.FileName}</span>  </td>
                  <td><button class="download-btn col-btn-css" onClick={() => downloadBase64File(file.FileData, file.FileName)}><i class="fa fa-download" aria-hidden="true"></i></button></td>
                  <td><button class="download-btn col-btn-css" onClick={() => handleviewer(pos)}><i class="fa fa-eye" aria-hidden="true"></i></button></td>
                  </tr>
                              
                        //     <div class="file-item">
 
                        //         <Row>
                        //         <div className='col-lg-1 col-sm-1'>
                        //         <img src={link} className='back-img'></img>
                        //         </div>
                        //         <div className='col-lg-9 col-sm-9'>
                        //         <span> {file.FileName}</span>
                        //         </div>
                        //         <div className='col-lg-2 col-sm-8'>
                        //         <button class="download-btn col-btn-css" onClick={() => downloadBase64File(file.FileData, file.FileName)}><i class="fa fa-download" aria-hidden="true"></i></button>
                        //         </div>
                        //         </Row>

                        //         </div> 
                            )   
                          }) : <tr><td colSpan="3" className='notfound'><h4><img src="/images/nodata.png" className='back-img'></img> No Document Found</h4></td></tr> }
  </tbody>
  </Table>
  </div>
                   {policiesdocument && policiesdocument.length > 0 && <button onClick={handleDownloadAll} className="btn btn-primary col-btn-css" ><i class="fa fa-download" aria-hidden="true"></i> Download All as ZIP</button> } 
                  
      </Container>
    </Modal.Body>
     <PoliciesDocumentViewer isOpen={isModalOpen} closeModal={closeModal1} policiesdocument={policiesdocument} index={isindex} />
    </Modal>
  )
};


const mapStateToProps = (state) => {
    return {
      user: state.user,
      policiesdocument: state.dashboard.my_doc,
    };
  };
export default connect(mapStateToProps)(PoliciesDocumentModal);