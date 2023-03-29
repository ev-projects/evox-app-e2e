import React, { useState, useEffect } from "react";
import { Table } from "react-bootstrap";
import { Link } from "react-router-dom";
import Authenticator from "../../services/Authenticator";
import axios from "axios";
import {
  ContainerWrapper,
  ContainerBody,
  Content,
} from "../../components/GridComponent/AdminLte.js";
import PreLoader from "./PreLoader";
import { useDispatch } from "react-redux";
import { pagenationRoomlist, viewRoomlist } from "./Createroomapi";
import Pagination from "react-bootstrap-4-pagination";
const Roomlist = () => {
  const dispatch = useDispatch();
  const [totalpagecount, setTotalpagecount] = useState(1);
  const [currentpagecount, setCurrentpagecount] = useState(1);
  const [loader, setLoader] = useState(false);
  const [roomlist, setRoomlist] = useState([]);
  useEffect(() => {
    dispatch(viewRoomlist(setRoomlist, setTotalpagecount, setCurrentpagecount));
  }, []);

  let paginationConfig = {
    totalPages: totalpagecount,
    currentPage: currentpagecount,
    showMax: 10,
    size: "sm",
    threeDots: true,
    prevNext: true,
    borderColor: "#0097a7",
    activeBorderColor: "#0097a7",
    activeBgColor: "#0097a7",
    disabledBgColor: "white",
    activeColor: "white",
    color: "white",
    disabledColor: "white",
    // circle: true,
    // shadow: true,
    onClick: function (page) {
      console.log(page);
      setCurrentpagecount(page);

      dispatch(
        pagenationRoomlist(
          setRoomlist,
          page,
          setTotalpagecount,
          setCurrentpagecount
        )
      );
      // dispatch(pagenationRoomlist(setRoomlist,page,setTotalpagecount,
      //   setCurrentpagecount))
    },
  };

  return (
    <div>
      {loader && <PreLoader />}

      <ContainerWrapper>
        <ContainerBody>
          <Content label="Create Room">
            <h2 className="page-title"> Room list</h2>
            <div className="mb-3">
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Sno</th>
                    <th>RoomName</th>
                    <th>Location</th>
                    <th>Seats</th>
                    <th>Description</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {roomlist.length > 0 &&
                    roomlist.map((room, pos) => (
                      <tr>
                        <td>{room.id}</td>
                        <td>{room.name}</td>
                        <td>{room.location}</td>
                        <td>{room.seats} </td>
                        <td>{room.description} </td>

                        <td className="actions">
                          <span>
                            {Authenticator.check(
                              "supervisor",
                              "view_employee_dtr"
                            ) && (
                              <Link
                                to={{
                                  pathname: global.links.room_master + room.id,
                                  resetInitialState: true,
                                }}
                                title="View Room Details"
                              >
                                <i
                                  className="fa fa-eye ev-color"
                                  aria-hidden="true"
                                ></i>
                              </Link>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </Table>
            </div>
            <Pagination {...paginationConfig} />
          </Content>
        </ContainerBody>
      </ContainerWrapper>
    </div>
  );
};

export default Roomlist;
