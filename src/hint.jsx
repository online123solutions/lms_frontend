import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { fetchDocument } from "./api/apiservice"; // Import the fetchDocument function

const DocumentViewer = ({ url }) => {
  const [fileBlob, setFileBlob] = useState(null);
  const [error, setError] = useState(null);
  const [fileType, setFileType] = useState(null);

  useEffect(() => {
    const fetchAndSetDocument = async () => {
      try {
        const response = await fetchDocument(url);
        if (!response.success) {
          throw new Error(response.error);
        }

        const blobURL = URL.createObjectURL(response.blob);
        setFileBlob(blobURL);
        setFileType(response.fileType);
      } catch (err) {
        setError(err.message);
      }
    };

    fetchAndSetDocument();
  }, [url]);

  if (error) {
    return <p>Error loading document: {error}</p>;
  }

  const renderFile = () => {
    if (fileType?.includes("pdf")) {
      return (
        <iframe
          src={fileBlob}
          title="PDF Document"
          width="100%"
          height="570px"
        />
      );
    }

    if (fileType?.includes("msword") || fileType?.includes("word")) {
      return (
        <iframe
          src={`https://docs.google.com/gview?url=${fileBlob}&embedded=true`}
          title="Word Document"
          width="100%"
          height="570px"
        />
      );
    }

    if (fileType?.includes("excel")) {
      return (
        <iframe
          src={`https://docs.google.com/gview?url=${fileBlob}&embedded=true`}
          title="Excel Document"
          width="100%"
          height="570px"
        />
      );
    }

    return <p>Unsupported file type</p>;
  };

  return fileBlob ? renderFile() : <p>Loading document...</p>;
};

DocumentViewer.propTypes = {
  url: PropTypes.string.isRequired,
};

export default DocumentViewer;
