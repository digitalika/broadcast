const App = (function(){
  const _appStates = {
    notLoaded: -1,
    idle: 1,
    busy: 2
  };

  const _state = {
    isViewARMode: false,
    isJeeFitInitialized: false,
    fileName: 'undefined', // without extension
    threeLoadedGLTF: null,
    appState: _appStates.notLoaded,
    selectedMaterialIndex: -1,
    JEModelJSON: null,
    JEModel: null,
    JECam: null
  };

  let _spec = null;
  let _matGui = null;
  const _defaultSpec = {
     GLTFInputFileURL: null
  };

  const that = {
    init: function(spec){
      _spec = Object.assign({}, _defaultSpec, spec);
      _state.appState = _appStates.idle;

      that.set_UI();

      const promises = [
          that.init_JeelizEngine3D()
        ];

      Promise.all(promises).then(function(){
        console.log('[INIT] in App.js: we are all set bro');
        if (_spec.GLTFInputFileURL){
          _state.fileName = _spec.GLTFInputFileURL.split('/').pop(); // remove path
          that.load_GLTF(_spec.GLTFInputFileURL);
        }
      });
    },

    init_jeeFit(){
      _state.appState = _appStates.busy;
      return new Promise(function(accept, reject){
        JEELIZVTOWIDGET.start({
          assetsPath: './',
          NNCPath: './libs/JeelizVTOWidget/jeefitNNC.json',
          //searchImageMask: 'images/target.png',
          searchImageColor: 0xeeeeee,
          onError: function(errorLabel){ 
            console.log('ERROR: JEELIZVTOWIDGET cannot be initialized because ', errorLabel);
            _state.appState = _appStates.idle;
            accept();
          },
          callbackReady: function(){
            console.log('INFO: JEELIZVTOWIDGET is initialized successfully');
            JEELIZVTOWIDGET.load_modelStandalone(_state.JEModelJSON, function(){
              _state.appState = _appStates.idle;
              accept();
            });            
          }
        }); // end JEELIZVTOWIDGET.start()
      }); // end returned promise
    },

    init_JeelizEngine3D(){
      return new Promise(function(accept, reject){
        // set view3DCanvas canvas at resolution of view3DPlaceHolder:
        const jqPlaceHolder = $('#view3DPlaceHolder');
        const cssOverSamplingFactor = 1.5;
        const w0 = jqPlaceHolder.width();
        const h0 = jqPlaceHolder.height();
        const w = Math.round(cssOverSamplingFactor * w0);
        const h = Math.round(cssOverSamplingFactor * h0);
        $('#view3DCanvas').attr('width', w).attr('height', h).css({width: w0.toString()+'px', height: h0.toString()+'px'});
        
        // Init JeelizEngine3D:
        JEContext.init({
          insaneMode: false,
          canvasId: 'view3DCanvas',
          expand: false,
          alpha: true,
          onload: function() {
            console.log('INFO: JeelizEngine3D is ready');
            // set background texture:
            JEScene.set_backgroundTexture('images/backgrounds/viewer3D.png');
            JEScene.disable_FPSCounter();
            JEContext.update_overSamplingFactor(1.7);

            // set camera:
            _state.JECam = JECamera.instance({
              fov: JESETTINGS.cameraFOV,
              zNear: JESETTINGS.cameraZnear,
              zFar: JESETTINGS.cameraZfar,
              direction: [0, 0, -1],
              resizable: true
            });

            accept();
          }
        }); //end Context init
        
      });
    },

    load_GLTF: function(GLTFFileURL){
      if (_state.isViewARMode){
        that.toggle_viewAR();
      }
      return new Promise(function(accept, reject){
        console.log('[INFO] load_GLTF() with URL', GLTFFileURL);
        if (_state.appState !== _appStates.idle){
          reject();
          return;
        }
        _state.appState = _appStates.busy;
        _state.threeLoadedGLTF = null;
        _state.JEModelJSON = null;
        _state.selectedMaterialIndex = -1;

        JEScene.stop_animate();
        if (_state.JEModel){
          JEScene.remove_object(_state.JEModel);
          _state.JEModel = null;
        }

        new THREE.GLTFLoader().load(GLTFFileURL, function(gltf){
          _state.threeLoadedGLTF = gltf;
          const JEModelJSON = GLTF2JE.convert_gltf(gltf);
          _state.JEModelJSON = JEModelJSON;

          _state.JEModel = JEMesh.instance({
            url: JEModelJSON.model,
            materials: JEModelJSON.materials,
            autoScale: false,
            autoCenter: false,
            callback: function(){
              console.log('INFO in App.js: JEMesh created');
              JEScene.start_animate();
              _state.appState = _appStates.idle;
              setTimeout(function(){
                that.update_materialsUI();
                that.update_UI();
              }, 1);
              accept();
            }
          }); // end JEMesh instantiation
          JEScene.add_object(_state.JEModel);
        }); // end THREE GLTF loaded
      }); // end returned promise
    }, // end load_GLTF()

    update_materialsUI: function(){
      // clear previous UI:
      $('#material').empty();
      if (_matGui){
        _matGui.destroy();
        _matGui = null;        
      }

      // create new UI:
      const JEMats = _state.JEModelJSON.materials;      
      JEMats.forEach(function(JEMat, matIndex){
        const opt = new Option('MATERIAL: ' + JEMat.name, matIndex);
        $('#material').append(opt);
      });
      if (JEMats.length > 0){
        that.select_material(0);
      }
    },

    select_material: function(selectedMaterialIndex){
      if (selectedMaterialIndex === _state.selectedMaterialIndex){
        return;
      }

      if (_matGui){
        _matGui.destroy();
        _matGui = null;        
      }

      const matSettings = _state.JEModelJSON.materials[selectedMaterialIndex];
      _state.selectedMaterialIndex = selectedMaterialIndex;

      _matGui = new dat.GUI({
        autoPlace: false,
        width: $('#controls').width()
      });
      $('#materialEditor').append(_matGui.domElement);

      const update = function(){
        _state.JEModel.update_material(selectedMaterialIndex, matSettings);
        if (_state.isViewARMode){
          JEELIZVTO.update_material(selectedMaterialIndex, matSettings);
        }
      };

      const groupPBR = _matGui.addFolder('PBR parameters')
      groupPBR.addColor(matSettings, 'diffuseColor').name('color').onChange(update);
      groupPBR.add(matSettings, 'metalness', 0, 1).step(0.01).onChange(update);
      groupPBR.add(matSettings, 'roughness', 0, 1).step(0.01).onChange(update);
      if (matSettings.diffuseTexture){
        groupPBR.add(matSettings, 'colorTextureUsage', 0, 1).step(0.01).onChange(update);
      }
      groupPBR.open();

      const groupFresnel = _matGui.addFolder('Fresnel (Schlick approx.)');
      groupFresnel.add(matSettings, 'fresnelMin', 0, 1).step(0.01).onChange(update);
      groupFresnel.add(matSettings, 'fresnelMax', 0, 1).step(0.01).onChange(update);
      groupFresnel.add(matSettings, 'fresnelPow', 0, 15).step(0.01).onChange(update);
      groupFresnel.open();

      const groupAlpha = _matGui.addFolder('Opacity');
      groupAlpha.add(matSettings.alpha, '0', 0,1).name('min').step(0.01).onChange(update);
      groupAlpha.add(matSettings.alpha, '1', 0,1).name('max').step(0.01).onChange(update);
      groupAlpha.add(matSettings.alpha, '2', -100,100).name('gradient Y start').step(0.1).onChange(update);
      groupAlpha.add(matSettings.alpha, '3', -100,100).name('gradient Y stop').step(0.1).onChange(update);
      groupAlpha.open();
    },

    toggle_viewAR: function(){
      if (_state.appState !== _appStates.idle) {
        return;
      }
      if (_state.isViewARMode){
        // exit AR mode:
        JEELIZVTO.switch_sleep(true);
        _state.isViewARMode = false;
        that.update_UI();
        return;
      }
      // start view AR mode:
      _state.isViewARMode = true;
      that.update_UI();
      if (_state.isJeeFitInitialized){
        JEELIZVTO.switch_sleep(false);
        JEELIZVTOWIDGET.load_modelStandalone(_state.JEModelJSON, function(){
          _state.appState = _appStates.idle;
        });           
      } else {
        that.init_jeeFit();
        _state.isJeeFitInitialized = true;
      }
    },

    set_UI: function(){
      that.update_UI();

      // bind events:
      // Bind View in AR button:
      $('#buttonViewAR').click(that.toggle_viewAR);

      // bind import GLTF:
      $('#buttonImportGLTF').click(function(e){
        $('#inputFileImportGLTF').click();
      });
      $('#inputFileImportGLTF').change(function(e){
        if (_state.appState !== _appStates.idle){
          return;
        }

        // check input:
        if (!e.target.files) return;
        if (e.target.files.length > 1){
          alert('You can only select one file at once');
          return;
        }

        const file = e.target.files[0];

        // extract fileName:
        const fileName = file.name;
        console.log('INFO: ', fileName, ' selected');
        _state.fileName = fileName;

        // read file:
        const reader = new FileReader();
        reader.onload = function(event) {
          const blob = new Blob([new Uint8Array(event.target.result)], {type: file.type });
          const fileURL = window.URL.createObjectURL(blob);
          that.load_GLTF(fileURL);
        }
        reader.readAsArrayBuffer(file);
      });
      
      // bind change material select box:
      $('#material').change(function(event){
        if (!_state.JEModel){
          return;
        }

        const selectedMaterialIndex = parseInt(event.target.value);
        that.select_material(selectedMaterialIndex);
      });

      // bind Export as JSON button:
      $('#buttonExportJSON').click(that.export_JSON);
    }, //end set_ui()

    export_JSON: function(){
      if (_state.appState !== _appStates.idle || !_state.JEModel){
        return;
      }
      _state.appState = _appStates.busy;

      // create a deep copy:
      const exportedObj = JSON.parse(JSON.stringify(_state.JEModelJSON));

      // truncate arrays:
      const truncate_floatArr = function(floatArr, prec){
        const pw = Math.pow(10, prec);
        for (let i=0; i<floatArr.length; ++i){
          const v = floatArr[i];
          const vTrunc = Math.round(v * pw) / pw;
          floatArr[i] = vTrunc;
        }
      };
      if (exportedObj.model.uvs && exportedObj.model.uvs.length){
        truncate_floatArr(exportedObj.model.uvs[0], 4);
      }
      truncate_floatArr(exportedObj.model.vertices, 4);      
      
      // download exportedObj as a file:
      const exportedStr = JSON.stringify(exportedObj);
      const blob = new Blob([exportedStr], {type: "octet/stream"});
      const url = window.URL.createObjectURL(blob);

      // remove extension from _state.fileName:
      const fileNameParsed = _state.fileName.split('.');
      fileNameParsed.pop();
      const fileNameNoExt = fileNameParsed.join('.');          
    
      // create a temporary download button
      const a = document.createElement("a");
      document.body.appendChild(a);
      a['style'] = "display: none";
      a['href'] = url;
      a['download'] = fileNameNoExt + '.json';

      // fake click on the button:
      setTimeout(function(){
        a.click();
        setTimeout(function(){
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          _state.appState = _appStates.idle;
        }, 500);
      }, 500);
    },

    update_UI: function(){
      if (_state.JEModel){
        $('#importModelNotice').hide();
        if (_state.isViewARMode){
          $('#buttonViewAR').text('Back to 3D');
          $('#view3DCanvas').hide();
          $('#JeelizVTOWidget').show();
        } else {
          $('#buttonViewAR').text('View in AR');
          $('#view3DCanvas').show();
          $('#JeelizVTOWidget').hide();
        }
        $('#buttonViewAR').prop('disabled', false);
        $('#buttonExportJSON').prop('disabled', false);
        $('#material').prop('disabled', false);
      } else {
        $('#importModelNotice').show();
        $('#view3DCanvas').hide();
        $('#JeelizVTOWidget').hide();
        $('#buttonViewAR').prop('disabled', true);
        $('#buttonExportJSON').prop('disabled', true);
        $('#material').prop('disabled', true);
        $('#material').empty().append(new Option("Select a material to edit", "none"));
      }
    }
  } //end that
  return that;
})(); 
