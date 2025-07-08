import os
import json
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException
import magic
import mimetypes
import chardet

app = FastAPI()

def get_file_info(file_path: str) -> Dict[str, Any]:
    """Get detailed information about a file."""
    try:
        stats = os.stat(file_path)
        mime = magic.Magic(mime=True)
        mime_type = mime.from_file(file_path)
        
        file_info = {
            "path": file_path,
            "size": stats.st_size,
            "created": stats.st_ctime,
            "modified": stats.st_mtime,
            "mime_type": mime_type,
            "extension": os.path.splitext(file_path)[1],
            "is_binary": not mime_type.startswith(('text/', 'application/json'))
        }
        
        # Try to detect encoding for text files
        if not file_info["is_binary"]:
            try:
                with open(file_path, 'rb') as f:
                    raw_data = f.read()
                    result = chardet.detect(raw_data)
                    file_info["encoding"] = result["encoding"]
            except:
                file_info["encoding"] = None
                
        return file_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze_file")
async def analyze_file(data: Dict[str, str]):
    """Analyze a file and return detailed information."""
    file_path = data.get("path")
    if not file_path:
        raise HTTPException(status_code=400, detail="File path is required")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        
    return get_file_info(file_path)

@app.post("/read_file")
async def read_file(data: Dict[str, str]):
    """Read and return file contents with encoding detection."""
    file_path = data.get("path")
    if not file_path:
        raise HTTPException(status_code=400, detail="File path is required")
    
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
    
    file_info = get_file_info(file_path)
    
    if file_info["is_binary"]:
        raise HTTPException(status_code=400, detail="Cannot read binary files")
    
    try:
        with open(file_path, 'rb') as f:
            raw_data = f.read()
            encoding = chardet.detect(raw_data)["encoding"] or "utf-8"
            content = raw_data.decode(encoding)
            
        return {
            "content": content,
            "encoding": encoding,
            "info": file_info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/list_directory")
async def list_directory(data: Dict[str, Any]):
    """List contents of a directory with detailed information."""
    dir_path = data.get("path")
    recursive = data.get("recursive", False)
    
    if not dir_path:
        raise HTTPException(status_code=400, detail="Directory path is required")
    
    if not os.path.exists(dir_path):
        raise HTTPException(status_code=404, detail=f"Directory not found: {dir_path}")
    
    if not os.path.isdir(dir_path):
        raise HTTPException(status_code=400, detail=f"Path is not a directory: {dir_path}")
    
    try:
        files = []
        if recursive:
            for root, _, filenames in os.walk(dir_path):
                for filename in filenames:
                    file_path = os.path.join(root, filename)
                    files.append(get_file_info(file_path))
        else:
            for item in os.listdir(dir_path):
                item_path = os.path.join(dir_path, item)
                if os.path.isfile(item_path):
                    files.append(get_file_info(item_path))
        
        return {"files": files}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
