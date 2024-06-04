import React, { useEffect, useState } from "react";
import Pagination from "../Pagination";
import style from "./AddUserDetails.module.scss";
import { useSidebarToggler } from "../../ContextHooks/sidebarToggler";
import { Button, Col, Input, Row } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebase";
import { doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { Image, Upload, message } from "antd";
import {
  ref,
  getDownloadURL,
  uploadBytesResumable,
  listAll,
  deleteObject,
} from "firebase/storage";
import { PlusOutlined } from "@ant-design/icons";
import { storage } from "../../../firebase";
import { v4 as uuidv4 } from "uuid";
import { FaUser } from "react-icons/fa";
import { GrUserSettings } from "react-icons/gr";
import { useDispatch } from "react-redux";
import { getAllUsers } from "../../../Redux/UserSlice";
const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
export default function AddUserDetails() {
  const { sidebarVisible } = useSidebarToggler();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [toggle, setToggler] = useState("user");

  // Data
  const [data, setData] = useState({
    fname: "",
    lname: "",
    email: "",
    password: "",
    confirmPassword: "",
    username: "",
    avatar: "",
    avatarID: "",
    role: "",
  });
  const changeHandler = (e) => {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
  };

  // Password Validation
  const [passwordError, setPasswordError] = useState("");
  const passwordValidator = () => {
    if (
      data.password &&
      data.confirmPassword &&
      data.password !== data.confirmPassword
    ) {
      setPasswordError("Passwords do not match, please confirm your password!");
    } else if (data.password && data.confirmPassword) {
      const lowerCase = /[a-z]/g;
      const upperCase = /[A-Z]/g;
      const numbers = /[0-9]/g;
      if (!data.password.match(lowerCase)) {
        setPasswordError("Password should contain lowercase letters!");
      } else if (!data.password.match(upperCase)) {
        setPasswordError("Password should contain uppercase letters!");
      } else if (!data.password.match(numbers)) {
        setPasswordError("Password should contain numbers also!");
      } else if (data.password.length < 10) {
        setPasswordError("Password length should be more than 10.");
      } else {
        setPasswordError("Password is strong!");
      }
    }
  };

  useEffect(() => {
    passwordValidator();
  }, [data.password, data.confirmPassword]);

  // Image Upload
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [fileList, setFileList] = useState([]);

  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
  };
  const handleChange = ({ fileList: newFileList }) => setFileList(newFileList);
  const uploadButton = (
    <div>
      <PlusOutlined style={{ fontSize: "30px", color: "#2275fc" }} />
      <div style={{ marginTop: 8 }}>
        Drop your images here or <p style={{ color: "#007aff" }}>Click Here</p>
      </div>
    </div>
  );
  const handleCustomRequest = async ({
    file,
    onProgress,
    onSuccess,
    onError,
  }) => {
    const imageUUID = uuidv4();
    const imageref = ref(storage, `/images/${imageUUID}/${file.name}`);
    const uploadTask = uploadBytesResumable(imageref, file);

    uploadTask.on(
      "state_changed",
      (snapshot) => {
        const progress =
          (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress({ percent: progress });
      },
      (error) => {
        console.error("Upload error:", error);
        message.error("Upload failed!");
        onError(error);
      },
      async () => {
        try {
          const imageUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setData((prevData) => ({
            ...prevData,
            avatarID: imageUUID,
            avatar: imageUrl,
          }));
          message.success("Upload success!");
          onSuccess(null, file);
        } catch (error) {
          console.error("Error getting download URL:", error);
          message.error("Failed to get image URL!");
          onError(error);
        }
      }
    );
  };

  // Delete Images

  const handleDeleteImages = async (record) => {
    try {
      message.loading("Deleting, Please wait..");
      const folderRef = ref(storage, `images/${record.avatarID}`);
      const result = await listAll(folderRef);
      const filesToDelete = result.items.filter((item) =>
        item.name.includes(file.name)
      );
      const deletePromises = filesToDelete.map(async (fileRef) => {
        const url = await getDownloadURL(fileRef);
        await deleteObject(fileRef);
        return url;
      });

      const deletedUrls = await Promise.all(deletePromises);

      setData((prevData) => ({
        ...prevData,
        avatar: "",
      }));

      message.info("Deletion Successful");
    } catch (error) {
      console.error(`Error deleting old images`, error);
    }
  };

  const SubmitHandler = async (e) => {
    e.preventDefault();
    try {
      message.open({ content: "Adding New User", type: "loading" });

      await createUserWithEmailAndPassword(auth, data.email, data.password);
      const currentUser = auth.currentUser;
      if (currentUser) {
        await setDoc(doc(db, "Users", currentUser.uid), {
          email: data.email,
          firstName: data.fname,
          lastName: data.lname,
          username: data.username,
          avatar: data.avatar,
          avatarID: data.avatarID,
          role: toggle,
        });
      }
      message.open({ content: "Added", type: "success" });
      dispatch(getAllUsers());
      navigate("/Users/AllUsers");
      console.log(data);
    } catch (error) {
      console.log(error);
      message.open({ content: "Failed", type: "error" });
    }
  };
  console.log(data);
  return (
    <div
      className={
        sidebarVisible === false
          ? `${style.AddUserDetails} ${style.AddUserDetailsFull} `
          : style.AddUserDetails
      }
    >
      <div className={style.pageHeader}>
        <p className={style.cardTitle}>Add User</p>
        <Pagination />
      </div>
      <div className={style.cardBG}>
        <Row>
          <Col xs={24} sm={24} md={10} lg={10}>
            <span>
              <h3>Account</h3>
              <p>Fill in the information below to add a new account</p>
            </span>
          </Col>
          <Col xs={24} sm={24} md={14} lg={14}>
            <form>
              <p className={style.auTitle}>First Name</p>
              <Input
                className={style.auInput}
                placeholder="Enter First Name"
                onChange={changeHandler}
                type="text"
                name="fname"
                required
                value={data.fname}
              ></Input>
              <p className={style.auTitle}>Last Name</p>
              <Input
                className={style.auInput}
                placeholder="Enter Last Name"
                onChange={changeHandler}
                type="text"
                name="lname"
                required
                value={data.lname}
              ></Input>
              <p className={style.auTitle}>Username</p>
              <Input
                className={style.auInput}
                placeholder="Enter Username"
                onChange={changeHandler}
                type="text"
                name="username"
                required
                value={data.username}
              ></Input>
              <p className={style.auTitle}>Email</p>
              <Input
                className={style.auInput}
                placeholder="Enter Email"
                onChange={changeHandler}
                type="text"
                name="email"
                required
                value={data.email}
              ></Input>
              <p className={style.auTitle}>Password</p>
              <Input
                className={style.auInput}
                placeholder="Enter Password"
                onChange={changeHandler}
                type="text"
                name="password"
                required
                value={data.password}
              ></Input>
              <p className={style.auTitle}>Confirm Password</p>
              <Input
                className={style.auInput}
                placeholder="Confirm Password"
                onChange={changeHandler}
                type="text"
                name="confirmPassword"
                required
                value={data.confirmPassword}
              ></Input>
              {passwordError && (
                <p className="sa-password-error">{passwordError}</p>
              )}
              <p className={style.auTitle}>Upload Avatar</p>
              <div className="apdImgSize">
                <Upload
                  customRequest={handleCustomRequest}
                  listType="picture-card"
                  fileList={fileList}
                  onPreview={handlePreview}
                  onChange={handleChange}
                  onRemove={handleDeleteImages}
                >
                  {fileList.length === 1 ? null : uploadButton}
                </Upload>
                {previewImage && (
                  <Image
                    wrapperStyle={{
                      display: "none",
                    }}
                    preview={{
                      visible: previewOpen,
                      onVisibleChange: (visible) => setPreviewOpen(visible),
                      afterOpenChange: (visible) =>
                        !visible && setPreviewImage(""),
                    }}
                    src={previewImage}
                  />
                )}
              </div>
            </form>
          </Col>
        </Row>
      </div>
      <div className={style.cardBG}>
        <Row>
          <Col xs={24} sm={24} md={10} lg={10}>
            <span>
              <h3>Permissions</h3>
              <p>Items that the account is allowed to edit</p>
            </span>
          </Col>
          <Col>
            <p className={style.auTitle}>Role</p>
            <span className={style.auRoleBox}>
              <span
                onClick={() => {
                  setToggler("admin");
                }}
                className={
                  toggle === "admin" ? style.auRoleActive : style.auRole
                }
              >
                <i>
                  <GrUserSettings />
                </i>
                Admin
              </span>
              <span
                className={
                  toggle === "user" ? style.auRoleActive : style.auRole
                }
                onClick={() => {
                  setToggler("user");
                }}
              >
                <i>
                  <FaUser />
                </i>
                User
              </span>
            </span>
          </Col>
        </Row>
      </div>
      <div
        className={style.cardBG}
        style={{
          background: "transparent",
          boxShadow: "none",
          padding: "20px 0",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Button onClick={SubmitHandler} className={style.apButton}>
          Save
        </Button>
      </div>
    </div>
  );
}