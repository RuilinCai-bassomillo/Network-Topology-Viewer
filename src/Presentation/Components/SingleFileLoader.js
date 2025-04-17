import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setJsonData } from '../../Data/JsonDataSlice';

const SingleFileUploader = () => {
  const [file, setFile] = useState(null);
  const [json, setJson] = useState(null); // To store parsed JSON data
  const dispatch = useDispatch();
  const { data, fileName} = useSelector((state) => state.jsonData);
  const [status, setStatus] = useState("initial")

  const handleFileChange = (e) => {
    if (e.target.files) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);

      // Read the file content when file is selected
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsedJson = JSON.parse(event.target.result);
          setJson(parsedJson);
        } catch (error) {
          console.error('Error parsing JSON:', error);
          alert('Invalid JSON file');
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!json) {
      alert('No valid JSON data to upload');
      setStatus("fail")
      return;
    }
    dispatch(setJsonData({
      data: json,
      fileName: file.name
    }));
    setStatus("success")

  };

  return (
    <>
      <div className="input-group">
        <input id="file" type="file" accept=".json" onChange={handleFileChange} />
      </div>
      {file && (
        <section>
          File details:
          <ul>
            <li>Name: {file.name}</li>
            <li>Type: {file.type}</li>
            <li>Size: {file.size} bytes</li>
          </ul>
        </section>
      )}
      {file && (
        <button onClick={handleUpload} className="submit">
          Upload a file
        </button>
      )}
      <Result status={status} />
    </>
  );
};

const Result = ({ status }) => {
  if (status === 'success') {
    return <p>File uploaded successfully!</p>;
  } else if (status === 'fail') {
    return <p>File upload failed!</p>;
  } else if (status === 'uploading') {
    return <p>Uploading selected file...</p>;
  } else {
    return null;
  }
};

export default SingleFileUploader;