const GLTF2JE = {
  // take a GLTF imported with THREE.js GLTF importer
  // to a mesh usable by JeelizEngine3D    
  // output schema:
  /*
  model: {
   
    "faces": [p0,p1,p2, uv0,uv1,uv2, mat, ... ]
    "uvs": [u0,v0,...],
    "vertices": [x0,y0,z0,...],
    "metadata": {
      "vertices": 1736,
      "faces": 3353
    },
    "tweaker": {
      "beginBendZ": -30,
      "bendStrength": 0.125,
      "maskBranchStartEnd": [
        -150.8,
        -69.2
      ]
    }
  }
  materials: [
    {
      mat0Params    
    },
    {
      mat1Params
    }
  ]

*/
  
  convert_gltf: function(gltf){
    const parts = [];
    let isUV = false;

    // take all meshes to extract parts:
    gltf.scene.traverse(function(threeStuff){
      if (!threeStuff.isMesh) return;     

      isUV = isUV || ('uv' in threeStuff.geometry.attributes)

      parts.push({
        mesh: threeStuff,
        name: (threeStuff.name || 'part_' + parts.length.toString()),
        mat: threeStuff.material
      });
    });

    // from WebAR.rocks.mirror ref to Jeefit glasses ref:
    // apply the same operation as in JeelizEngine3D/utils/convert_obj_jeeliz.py
    const create_mat4 = function(rx, s, ty, tz) {
      const cx = Math.cos(rx);
      const sx = Math.sin(rx);
      return new THREE.Matrix4().set(
        s, 0,     0,    0,
        0, s*cx,  s*sx, ty,
        0, -s*sx, s*cx, tz,
        0, 0,     0,    1
      );
    }
    //const matFromWARMirrorToJeefit = create_mat4(0.0, 83.72, 45, -10);
    const matFromWARMirrorToJeefit = create_mat4(0.0, 82, 45, -10);

    // concatenate parts to build the geometry:
    const faces = [], vertices = [], uvs = [];
    let verticeOffset = 0, uvOffset = 0;

    const nIndicesPerFace = (isUV) ? 3+3+1 : 3+1;
    for (let i = 0; i<parts.length; ++i){
      const threeMesh = parts[i].mesh;
      const geom = threeMesh.geometry.clone();

      // apply world matrix to geom:
      threeMesh.updateMatrixWorld();
      geom.applyMatrix4(threeMesh.matrixWorld);

      // From WARMirror to Jeefit:
      geom.applyMatrix4(matFromWARMirrorToJeefit);

      // get buffers from geometry:
      const bufFaces = geom.index.array;
      const bufPos = geom.attributes.position.array;
      let bufUV = null;
      if (geom.attributes.uv){
        bufUV = geom.attributes.uv.array;
      }

      // add faces:
      for (let j=0; j<bufFaces.length; j+=3){
         // p0, p1, p2: 
        faces.push(
          bufFaces[j]+verticeOffset, bufFaces[j+1]+verticeOffset, bufFaces[j+2]+verticeOffset          
        );

        // material index:
        faces.push(i);

        // uv0, uv1, uv2:
        if (isUV){
          if (bufUV){
            faces.push(
              bufFaces[j]+uvOffset, bufFaces[j+1]+uvOffset, bufFaces[j+2]+uvOffset
            );            
          } else {
            faces.push(0,0,0);
          }
        }
      }

      // add positions:
      for (let j = 0; j<bufPos.length; j+=3){
        vertices.push(bufPos[j], bufPos[j+1], bufPos[j+2]); // x,y,z
        ++verticeOffset;
      }

      // add uvs:
      if (bufUV){
        for (let j = 0; j<bufUV.length; j+=2){
          uvs.push(bufUV[j], bufUV[j+1]); // u,v
          ++uvOffset;
        }
      }
    } //end loop on parts

    // build metadata:
    const metadata = {
      vertices: vertices.length / 3,
      faces: faces.length / nIndicesPerFace
    };

    // build tweaker: 
    /*const tweaker = {
      beginBendZ: -30,
      bendStrength: 0, //0.10,
      maskBranchStartEnd: [
        -150,
        -70
      ]
    };*/

    // build materials:
    const materials = parts.map(function(part){
      part.mat.name = part.mat.name || part.name;
      return GLTF2JE.convert_material(part.mat);
    });

    return {
      model: {
        faces: faces,
        uvs: [uvs],
        vertices: vertices,
        metadata: metadata
        //,tweaker: tweaker
      },
      materials: materials
    };
  }, // end convert_gltf()

  extract_textureSrc: function(img){
    console.log('INFO in GLTF2JE.js - extract_textureSrc: Texture found in 3D model: ', img);

    const cv = document.createElement('canvas');
    cv.width = img.width, cv.height = img.height;
    const ctx = cv.getContext('2d');

    // flip vertically:
    ctx.translate(0, cv.height);
    ctx.scale(1, -1);
    ctx.drawImage(img, 0, 0);

    const copiedURL = cv.toDataURL('image/png');
    return copiedURL;
  },

  convert_material: function(threeMat){
    // PBR parameters:
    const roughness = ('roughness' in threeMat) ? threeMat.roughness: 0;
    const metalness = ('metalness' in threeMat) ? threeMat.metalness: 0;
    
    // mat color:
    const color = threeMat.color || threeMat.diffuse || new THREE.Color(1, 1, 1);
    const color255 = color.toArray();
    color255[0] = Math.round(255 * color255[0]);
    color255[1] = Math.round(255 * color255[1]);
    color255[2] = Math.round(255 * color255[2]);

    // textures
    let diffuseTexture = "", normalTexture = "";

    const alpha0 = ('opacity' in threeMat) ? threeMat.opacity : 1;
    const alpha = [
      alpha0, 1, // alphaMin, alphaMax
      -75, -15  // YMin, YMax
    ];
    
    if (threeMat.map) {
      diffuseTexture = GLTF2JE.extract_textureSrc(threeMat.map.image); 
    }
    if (threeMat.normalMap){
      normalTexture = GLTF2JE.extract_textureSrc(threeMat.normalMap.image);
    }

    const mat = {
      "name": threeMat.name,

      "metalness": metalness,
      "roughness": roughness,

      "alpha": alpha,
      
      "diffuseColor": color255,
      "diffuseTexture": diffuseTexture,
      "colorTextureUsage": 0,

      // param texture is not enabled in this software yet:
      "paramsTexture": "",
      "paramsMapMask": [0,0,0,0],

      "normalTexture": normalTexture,
      
      "fresnelMin": (alpha0 === 1) ? 0.5 : 0,
      "fresnelMax": 1,
      "fresnelPow": 3
    };

    return mat;
  }
}