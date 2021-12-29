import { Injectable } from '@angular/core';
import {
  BackgroundGeolocation,
  BackgroundGeolocationEvents,
  BackgroundGeolocationResponse,
} from '@ionic-native/background-geolocation/ngx'
import { Storage } from '@ionic/storage';
import { HTTP } from '@ionic-native/http/ngx';
import { SMS } from '@ionic-native/sms/ngx';
import { Diagnostic } from '@ionic-native/diagnostic/ngx';

@Injectable({
  providedIn: 'root'
})
export class AlertingService {
  //#region VARS
  private API = {
    base_url: 'https://190.191.112.207/api/alerta_gps',
    headers: {
      //"Content-Type": "application/x-www-form-urlencoded; charset=utf-8", 
      //'Accept': 'application/json, text/plain',
      //"cache-control": "no-cache", 
      //"Access-Control-Allow-Origin": "*",
      //"Access-Control-Allow-Headers": "Origin, Content-Type, X-Auth-Token, Accept, Authorization, X-Request-With",
      //"Access-Control-Allow-Credentials" : "true",
      //"Access-Control-Allow-Methods" : "GET, POST, DELETE, PUT, OPTIONS, TRACE, PATCH, CONNECT"
    },
    refreshTime: 60 * 1000, //Tiempo que tarda en volver a enviar una alerta
    checkInterval: null,
    alertingInterval: null,
  }
  public status = {
    errors: [],
    prepared: null,
    title: 'Comprobando...',
    icon: 'help-circle',
    backcolor: '',
    timer_status: 0,
    activation: {
      active: true,
      tel: null
    },
    alerting: {
      sending: false,
      active: false,
      sms_only: false,
      title: ''
    },
    location: {
      enabled: true,
      auth: true
    },
    sms: {
      auth: true,
      timeout: null
    },
    internet: navigator.onLine,
    isPaused: false
  }
  //#endregion

  constructor(
    private storage: Storage,
    private backgroundGeolocation: BackgroundGeolocation,
    private sms: SMS,
    private http: HTTP,
    private diagnostic: Diagnostic
  ) {
    // Espero 10 segundos para iniciar el servicio y hacer el primer chequeo
    setTimeout(() => {
      this.api_check();
      // Cada 5 minutos verifico que la aplicación está activada
      setInterval(() => {
        this.api_check();
      }, 10 * 1000);
      // Preparo el servicio de localización 
      this.initializateBackgroundGeolocation();
    }, 10 * 1000);
  }

  //#region App Status 
  async check_app_status() {
    this.status.errors = [];

    /**
     * Activación
     */
    await this.storage.get('tel').then(_val => this.status.activation.tel = (_val) ? _val : null);
    await this.storage.get('long_key').then(long_key => {
      this.status.activation.active = (long_key !== null) ? true : false;
      if (!this.status.activation.active)
        this.status.errors.push('Necesita activación');
    })
    /**
     * Estado de internet
     */
    this.status.internet = navigator.onLine;
    if (!this.status.internet)
      this.status.errors.push('Sin internet')
    /*
     * Estado de la ubicación
     */
    await this.diagnostic.isLocationEnabled().then(
      isEnabled => {
        this.status.location.enabled = isEnabled;
        if (!this.status.location.enabled)
          this.status.errors.push('Ubicación desactivada');
      }
    );
    /*
     * Estado permiso de ubicación
     */
    await this.diagnostic.isLocationAuthorized().then(
      isAutorized => {
        this.status.location.auth = isAutorized;
        if (!this.status.location.auth)
          this.status.errors.push('Sin permiso para usar ubicación');
      }
    );
    /*
     * Estado permiso de SMS
     */
    await this.sms.hasPermission().then(
      hasPermission => {
        this.status.sms.auth = hasPermission;
        if (!this.status.sms.auth)
          this.status.errors.push('Sin permiso para enviar SMS');
      }
    );

    /**
     * Estado de alerta en curso
     */
    await this.storage.get('alert').then(_alert => {
      this.status.alerting.active = (_alert !== null) ? true : false;
      this.status.alerting.sms_only = (_alert == "SMS_ONLY") ? true : false;
    })


    /**
     * Finish
     */
    this.status.prepared = (this.status.activation.active && this.status.location.auth && this.status.sms.auth) ? true : false;
    if (this.status.prepared) {
      if (this.status.location.enabled && this.status.internet){
        this.status.title = '';
        this.status.alerting.title = '';  
        this.status.icon = 'checkmark-circle';
        this.status.backcolor = '';
      } else {
        this.status.title = 'Requiere atención';
        this.status.alerting.title = '';
        this.status.icon = 'warning';
        this.status.backcolor = 'warning';
      }
      if (this.status.alerting.active) {
        this.status.alerting.sending = false;
        if (this.status.alerting.sms_only) {
          this.status.title = 'Alerta registrada por SMS';
          this.status.icon = (this.status.errors.length > 0) ? 'warning' : 'navigate-circle';
          this.status.backcolor = (this.status.errors.length > 0) ? 'warning' : 'success';
          this.status.alerting.title = 'El Centro de Monitoreo tiene registrada su alerta';
          //Verifico que hayan pasado 5 minutos de cuando se creó la alerta para detenerla
          this.storage.get('alert_time').then(_time => {
            this.status.timer_status = Math.round((new Date().getTime() - _time) / 60000);
            if (_time) {
              // Calculo si la diferencia entre la fecha guardada y la fecha actual es mayor o igual a 5 minutos
              // Entonces borro la alerta por SMS
              if (Math.round((new Date().getTime() - _time) / 60000) >= 5) {
                this.storage.set('alert_time', null).then(() => {
                  this.storage.set('alert', null);
                }); 
              }
            } else
              this.storage.set('alert', null);
          })
          this.status.alerting.title += ', en ' + ((this.status.timer_status - 5) * -1) + ' minutos podrá enviar otra';
        } else {
          this.status.title = 'Alerta activa';
          this.status.icon = 'navigate-circle';
          this.status.backcolor = 'success';
          this.status.alerting.title = 'El Centro de Monitoreo tiene registrada su alerta\n';
          //Si hay una alerta registrada, activo el intervalo para checkear el estado de la misma
          if (this.API.alertingInterval === null)
            this.API.alertingInterval = setInterval(() => {
              this.api_alert_status()
            }, 10000)
        }
      }
    } else {
      this.status.title = 'Requiere atención';
      this.status.alerting.title = '';
      this.status.icon = 'warning';
      if (this.status.activation.active)
        this.status.backcolor = 'warning';
      else
        this.status.backcolor = 'danger';
    }
    return this.status;
  }
  //#endregion

  //#region BackgroundGeolocation
  initializateBackgroundGeolocation() {
    this.update_log('initializateBackgroundGeolocation')

    this.backgroundGeolocation.configure({
      locationProvider: 0,
      desiredAccuracy: 10,
      stationaryRadius: 5,
      distanceFilter: 5,
      notificationTitle: 'Alerta La Plata',
      notificationText: 'Servicio de alerta en ejecución',
      debug: false,
      interval: 5000,
    });

    this.backgroundGeolocation.on(BackgroundGeolocationEvents.location).subscribe(location => {
      this.update_log('BackgroundGeolocationEvents.location');
      // handle your locations here
      // to perform long running operation on iOS
      // you need to create background task
      this.backgroundGeolocation.startTask().then(taskKey => {
        if (this.status.location.enabled) {
          this.prepare_location(location);
        } else {
          this.update_log('BackgroundGeolocationEvents.location: Ubicación deshabilitada')
        }
        // execute long running task
        // eg. ajax post location
        // IMPORTANT: task has to be ended by endTask
        this.backgroundGeolocation.endTask(taskKey);
      });
    });

    this.backgroundGeolocation.on(BackgroundGeolocationEvents.stationary).subscribe(stationaryLocation => {
      this.update_log('BackgroundGeolocationEvents.stationary');
      //this.prepare_location(stationaryLocation);
      //this.update_log(JSON.stringify(stationaryLocation));
      // handle stationary locations here
    });

    this.backgroundGeolocation.on(BackgroundGeolocationEvents.error).subscribe(error => {
      this.update_log(JSON.stringify({ '[ERROR] BackgroundGeolocation error': error }));
    });

    this.backgroundGeolocation.on(BackgroundGeolocationEvents.start).subscribe(() => {
      this.update_log('[INFO] BackgroundGeolocation service has been started');
      // Inicio el intervalo para chequear el estado de la alerta y si está activa, hago un update
      //this.backgroundGeolocation.configure({ notificationTitle: this.status.title }).then(() => {
        //this.backgroundGeolocation.getCurrentLocation().then(currentLocation => {
        //  this.prepare_location(currentLocation);
        //});
      //});
    });

    this.backgroundGeolocation.on(BackgroundGeolocationEvents.stop).subscribe(() => {
      this.update_log('[INFO] BackgroundGeolocation service has been stopped');
      this.backgroundGeolocationReset();
    });

    this.backgroundGeolocation.on(BackgroundGeolocationEvents.authorization).subscribe(satus => {
      this.update_log('[INFO] BackgroundGeolocation authorization status: ' + status);
      if (status) {
        // we need to set delay or otherwise alert may not be shown
        setTimeout(function () {
          var showSettings = confirm('App requires location tracking permission. Would you like to open app settings?');
          if (showSettings) {
            return this.bakcgroundGeolocation.showAppSettings();
          }
        }, 1000);
      }
    });

    this.backgroundGeolocation.on(BackgroundGeolocationEvents.background).subscribe(() => {
      this.update_log('[INFO] App is in background');
      // you can also reconfigure service (changes will be applied immediately)
      //this.backgroundGeolocation.configure({ debug: true });
    });

    this.backgroundGeolocation.on(BackgroundGeolocationEvents.foreground).subscribe(() => {
      this.update_log('[INFO] App is in foreground');
      //this.backgroundGeolocation.configure({ debug: false });
    });

    this.backgroundGeolocation.on(BackgroundGeolocationEvents.abort_requested).subscribe(() => {
      this.update_log('[INFO] Server responded with 285 Updates Not Required');

      // Here we can decide whether we want stop the updates or not.
      // If you've configured the server to return 285, then it means the server does not require further update.
      // So the normal thing to do here would be to `BackgroundGeolocation.stop()`.
      // But you might be counting on it to receive location updates in the UI, so you could just reconfigure and set `url` to null.
    });

    this.backgroundGeolocation.on(BackgroundGeolocationEvents.http_authorization).subscribe(() => {
      this.update_log('[INFO] App needs to authorize the http requests');
    });

    // Checkeo el estado del servicio y si no hay alerta activa y el servicio está andando, lo detengo.
    this.backgroundGeolocation.checkStatus().then(status => {
      this.update_log(JSON.stringify({ '[INFO] bakcgroundGeolocation.status': status }));
    });

  }

  backgroundLocationRemoveAllListener() {
    this.backgroundGeolocation.removeAllListeners();
  }

  async backgroundGeolocationReset() {
    // Reinicio el intervalo a null
    if (this.API.alertingInterval !== null) {
      clearInterval(this.API.alertingInterval);
      this.API.alertingInterval = null;
    }
    // Reinicio el prev_latitude
    await this.storage.get('prev_latitude').then(_val => {
      if (_val)
        this.storage.set('prev_latitude', null);
    });
    // Reinicio el prev_longitude
    await this.storage.get('prev_longitude').then(_val => {
      if (_val)
        this.storage.set('prev_longitude', null);
    });
    // Vació el cache de las ubicaciones
    await this.backgroundGeolocation.getLocations().then(locations => {
      if (locations.length > 0)
        this.backgroundGeolocation.deleteAllLocations();
    });
  }
  //#endregion

  //#region Alerting
  startalerting() {
    if (!this.status.alerting.sending) {
      //Marco como enviando alerta
      this.status.alerting.sending = true;
      this.backgroundGeolocation.checkStatus().then(status => {
        if (!status.isRunning) {
          if (status.locationServicesEnabled) {
            // you don't need to check status before start (this is just the example)
            this.backgroundGeolocation.getCurrentLocation().then(currentLocation => {
              this.prepare_location(currentLocation);
            });
          } else {
            this.prepare_location();
          }
        }
      });
    }
  }

  updateAlert() {
    this.backgroundGeolocation.checkStatus().then(status => {
      if (status.isRunning)
        this.backgroundGeolocation.getCurrentLocation().then(currentLocation => {
          this.prepare_location(currentLocation).finally(() => {
            this.storage.set('msg', null)
          });
        });
    })
  }

  async prepare_location(currentLocation?: BackgroundGeolocationResponse) {
    //obtengo la fecha en el formato requerido
    let fullDatetime = new Date().toJSON().split('T');
    let datetime = fullDatetime[0] + " " + fullDatetime[1].substring(0, 5);

    //obtengo la ubicación previa
    let _prev_latitude: any,
      _prev_longitude: any;
    await this.storage.get('prev_latitude').then(_val => _prev_latitude = (_val) ? parseFloat(_val) : null);
    await this.storage.get('prev_longitude').then(_val => _prev_longitude = (_val) ? parseFloat(_val) : null);

    //obtengo el telefono, el tooken, el hash de la alerta y el mensaje que se envía.
    let _tel: any,
      _long_key: any,
      _alert: any,
      _message: any;
    await this.storage.get('tel').then(_val => _tel = (_val) ? _val : null);
    await this.storage.get('long_key').then(_val => _long_key = (_val) ? _val : null);
    await this.storage.get('alert').then(_val => _alert = (_val) ? _val : null);
    await this.storage.get('msg').then(_val => _message = (_val) ? _val : null);

    //Armo los parametros para enviarlos via API
    let location_params = {
      'tel': _tel || '',
      'key': _long_key || '',
      'latitude': 0,
      'longitude': 0,
      'client-datetime': datetime,
      'accuracy': 0,
      'distance': 0,
      'speed': 0,
      'direction': 0,
      'msg': _message || '',
      'alert': _alert,
    }

    if (currentLocation) {
      location_params.latitude = currentLocation.latitude;
      location_params.longitude = currentLocation.longitude;
      location_params.accuracy = currentLocation.accuracy;
      location_params.speed = currentLocation.speed;
      location_params.distance = (_prev_latitude && _prev_longitude) ? this.calculateDistance(_prev_latitude, _prev_longitude, currentLocation) : 0;
      if (location_params.distance > 0) {
        this.storage.set('prev_latitude', location_params.latitude.toString());
        this.storage.set('prev_longitude', location_params.longitude.toString());
      }
    }

    //Envio la alerta al servidor
    console.log({ location_params })
    await this.api_trigger_or_update(location_params);
  }

  //#endregion

  //#region APIs
  async api_check() {
    let params = {
      'tel': null,
      'key': null,
    };
    await this.storage.get('tel').then(_val => params.tel = (_val) ? _val : null);
    await this.storage.get('long_key').then(_val => params.key = (_val) ? _val : null);
    if (params.tel && params.tel && this.status.activation.active) {
      if (this.status.internet)
        await this.http.post(`${this.API.base_url}/check`, params, this.API.headers).then(
          () => { },
          err => {
            try {
              let _error = JSON.parse(err.error);
              switch (_error.status_code) {
                case 3: // La aplicación no está activada
                  this.storage.set('long_key', null);
                  break;
                default:
                  this.update_log(_error);
                  break;
              }
            } catch (e) {
              this.update_log(JSON.stringify({ '[CATCH] api_check': e }));
            }
          }
        );
      else
        this.update_log(JSON.stringify({ '[ERROR] api_check': 'Sin Internet' }))
    }
    await this.check_app_status();
  }

  async api_activate_app(_tel: string, _key: string) {
    let _activation = false;
    if (this.status.internet) {
      await this.storage.set('tel', _tel);
      let params = {
        'tel': _tel,
        'short-key': _key,
      }
      await this.http.post(`${this.API.base_url}/activate_app`, params, this.API.headers).then(
        response => {
          try {
            let _response = JSON.parse(response.data);
            switch (_response.result.code) {
              case 1: // Short key is not valid
                break;
              default:
                //Activo la app
                this.storage.set('long_key', _response.data.key);
                _activation = true;
                break;
            }
            this.update_log(JSON.stringify({ '[OK] response': _response }));
          } catch (e) {
            this.update_log(JSON.stringify({ '[CATCH] response': e }));
          }
        },
        err => {
          try {
            let _err = JSON.parse(err.error);
            this.update_log(JSON.stringify({ '[OK] err': _err }));
          } catch (e) {
            this.update_log(JSON.stringify({ '[CATCH] err': e }));
          }
        }
      ).finally(() => {
        this.check_app_status();
      });

    } else
      this.update_log(JSON.stringify({ '[ERROR] api_activate_app': 'Sin Internet' }))
    return _activation;
  }

  async api_alert_status() {
    if (this.status.internet) {
      let params = {
        'tel': null,
        'key': null,
        'alert': null,
      }
      await this.storage.get('tel').then(_val => params.tel = (_val) ? _val : "");
      await this.storage.get('long_key').then(_val => params.key = (_val) ? _val : "");
      await this.storage.get('alert').then(_val => params.alert = (_val) ? _val : "");
      //Si obtengo el telefono, el token y el hash de la alerta, hago la consulta del estado de la misma.
      if (params.tel && params.key && params.alert) {
        await this.http.post(`${this.API.base_url}/alert_status`, params, this.API.headers).then(
          response => {
            try {
              let _response = JSON.parse(response.data);
              switch (_response.result.code) {
                case 1: { // Alert is closed
                  this.storage.set('alert', null);
                  this.backgroundGeolocation.stop(); //stop service                
                  this.update_log(JSON.stringify({ '[RESPONSE 1] Alert status': _response.result }));
                  break;
                }
                case 0: {
                  this.update_log(JSON.stringify({ '[RESPONSE 0] Alert status': _response.result }));
                  break;
                }
                default: {
                  this.update_log(JSON.stringify({ '[RESPONSE DEF] Alert status': _response.result }));
                  break;
                }
              }
            } catch (e) {
              this.update_log(JSON.stringify({ '[RESPONSE CATCH] Alert status': e }));
            }
          },
          err => {
            try {
              this.update_log(JSON.stringify({ '[ERR OK] Alert status': err }));
            } catch (e) {
              this.update_log(JSON.stringify({ '[ERR CATCH] Alert status': e }));
            }
          }
        ).finally(() => {
          this.check_app_status();
        });
      }
    } else
      this.update_log(JSON.stringify({ '[ERROR] api_activate_app': 'Sin Internet' }))
  }

  async api_trigger_or_update(params) {
    let final_url = (params.alert) ? 'update' : 'trigger';
    if (final_url == 'trigger') { //Si voy a registrar la alerta, envío tambien por SMS
      try {
        let sms_message = `tel: ${params.tel}\nkey: ${params.key}\nlat: ${params.latitude}\nlng: ${params.longitude}\nmsg: ${params.msg}`;
        //Tel Prod: 2213573699
        this.sms.send('2213573699', sms_message).then(
          success => {
            //Guardo la fecha en la que se envió el mensaje
            this.storage.set('alert_time', new Date().getTime()); //formato en milisegundos
            this.update_log(JSON.stringify({ '[OK] SMS': success }));
          },
          error => {
            this.update_log(JSON.stringify({ '[ERROR] SMS': error }));
          });
      } catch (e) {
        this.update_log(JSON.stringify({ '[CATCH] SMS': e }));
      }
    }
    if (this.status.internet) {
      // Envío la consulta al servidor
      await this.http.post(`${this.API.base_url}/${final_url}`, params, this.API.headers).then(
        response => {
          try {
            let _response = JSON.parse(response.data);
            // Manejo los códigos de respuesta
            switch (_response.result.code) {
              case 0: { //Alerta enviada
                if (final_url == 'trigger') {
                  this.update_log(JSON.stringify({ '[RESPONSE] trigger': _response.result }));
                  //Guardo el hash de la alerta e inicio el servicio                  
                  this.storage.set('alert', _response.data.alert).then(() => {
                    this.backgroundGeolocation.start().then(started => {
                      this.update_log(JSON.stringify({ '[START] bakcgroundGeolocation': started }));
                    });
                  });
                } else
                  this.update_log(JSON.stringify({ '[RESPONSE] update': _response.result }));
                break;
              }
              case 1: { //Alerta ya cerrada
                this.update_log(JSON.stringify({ '[RESPONSE 1] TorU': _response.result }));
                this.storage.set('alert', null);
                this.backgroundGeolocation.stop(); //stop service                
                break;
              }
              case 3: { //Alerta ya registrada
                this.update_log(JSON.stringify({ '[RESPONSE 3] TorU': _response.result }));
                break;
              }
              default: {
                this.update_log(JSON.stringify({ '[RESPONSE DEF] TorU': _response.result }));
                break;
              }
            }
          } catch (e) {
            this.update_log(JSON.stringify({ '[RESPONSE CATCH] TorU': e }));
          }
        },
        err => {
          try {
            let _err = JSON.parse(err.error);
            this.update_log(JSON.stringify({ '[ERR] TorU': _err }));
          } catch (e) {
            this.update_log(JSON.stringify({ '[ERR CATCH] TorU': e }));
          }
        }
      ).finally(() => {
        this.check_app_status();
      });
    } else {
      this.update_log('No se puede iniciar la alerta via internet pero se deja marcada la alerta');
      this.storage.set('alert', 'SMS_ONLY');
    }
    this.status.isPaused = false;
  }
  //#endregion

  //#region extras
  calculateDistance(lat1: number, long1: number, location: BackgroundGeolocationResponse) {
    let lat2 = location.latitude;
    let long2 = location.longitude;
    let p = 0.017453292519943295;    // Math.PI / 180
    let c = Math.cos;
    let a = 0.5 - c((lat1 - lat2) * p) / 2 + c(lat2 * p) * c((lat1) * p) * (1 - c(((long1 - long2) * p))) / 2;
    let dis = (12742 * Math.asin(Math.sqrt(a))); // 2 * R; R = 6371 km
    return dis;
  }

  async update_log(message?: string) {
    console.log(message)
    await this.storage.get('logger').then(_logger => {
      //hay información en new_line (en caso que sea null se agrega un salto de linea simplemente)
      if (message) {
        //Obtengo la fecha y la formateo
        let datetime = new Date().toJSON().split('T')[1].substring(0, 5);
        //Le agrego la fecha y nueva linea
        message = `${datetime}: ${message}`;
      }
      //Si es la primera linea, la muestro sin salto de linea
      if (!_logger) {
        _logger = message;
      } else {
        _logger += `\n${message}`;
      }
      //Guardo la linea nueva
      this.storage.set("logger", _logger);
    });
  }

  //#endregion

}
