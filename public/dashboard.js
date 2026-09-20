document.addEventListener("DOMContentLoaded",()=>{


const token = localStorage.getItem("token");

const nombre = localStorage.getItem("nombre");


if(!token){

    window.location.href="index.html";

    return;

}


document.getElementById("nombreAdmin").innerText =
nombre || "Administrador";



let chartBarras=null;

let chartDona=null;

let mapa=null;

let tabla=null;



const zonasMapa=[

{
nombre:"El Milagro",
lat:-8.023047,
lng:-79.067330
},

{
nombre:"Villa del Mar",
lat:-8.097796,
lng:-79.062740
},

{
nombre:"Víctor Raúl",
lat:-8.021041,
lng:-79.070422
},

{
nombre:"Huanchaquito",
lat:-8.097705,
lng:-79.109337
},

{
nombre:"Huanchaco Balneario",
lat:-8.078579,
lng:-79.120930
},

{
nombre:"El Trópico",
lat:-8.086008,
lng:-79.076372
}

];



// =============================
// CARGAR DASHBOARD
// =============================


async function cargarDashboard(){


try{


const response = await fetch("/api/dashboard",{


headers:{


"Authorization":

"Bearer "+token


}


});



const data = await response.json();



if(!response.ok){


if(response.status===401){


localStorage.clear();

window.location.href="index.html";


}


throw new Error(data.message);


}



const dash=data.dashboard;


actualizarKpis(dash);


crearGraficoBarras(dash.partidos);


crearGraficoDona(dash.partidos);


crearMapa(dash.detalleZona);


crearRanking(dash.partidos);


crearTablaZona(dash.detalleZona);


crearTablaVotos(dash.votos);



document.getElementById(
"ultimaActualizacion"
).innerText =
new Date().toLocaleString();



}catch(error){


console.error(error);


alert(
"Error cargando dashboard"
);


}



}




// =============================
// KPI
// =============================


function actualizarKpis(dash){


document.getElementById("kpiTotal")
.innerText=dash.total;



let conDni=0;


let sinDni=0;



dash.votos.forEach(v=>{


if(v.dni){

conDni++;

}else{

sinDni++;

}


});



document.getElementById("kpiDni")
.innerText=conDni;



document.getElementById("kpiAnonimos")
.innerText=sinDni;



document.getElementById("kpiZonas")
.innerText=
Object.keys(dash.zonas).length;



if(dash.ganador){


document.getElementById("kpiGanador")
.innerText=
dash.ganador.nombre;



document.getElementById("kpiGanadorVotos")
.innerText=
dash.ganador.votos+" votos";


}


}
// =============================
// GRAFICO DE BARRAS
// =============================
let graficoBarras;


function crearGraficoBarras(partidos){


    const datos = Object.values(partidos);


    const labels = datos.map(p=>p.nombre);


    const valores = datos.map(p=>p.votos);



    const ctx = document
        .getElementById("graficoBarras")
        .getContext("2d");



    // destruir gráfico anterior
    if(graficoBarras){

        graficoBarras.destroy();

    }



    graficoBarras = new Chart(ctx,{


        type:"bar",


        data:{


            labels:labels,


            datasets:[{

                label:"Cantidad de votos",

                data:valores

            }]

        },


        options:{


            responsive:true,


            plugins:{


                legend:{


                    display:false


                }


            }


        }


    });


}

// =============================
// GRAFICO DONA
// =============================

let graficoDona;


function crearGraficoDona(partidos){


    const datos = Object.values(partidos);



    const ctx = document
        .getElementById("graficoDona")
        .getContext("2d");



    // evitar duplicar gráficos al actualizar cada cierto tiempo
    if(graficoDona){

        graficoDona.destroy();

    }



    graficoDona = new Chart(ctx,{

        type:"doughnut",


        data:{


            labels:datos.map(p=>p.nombre),


            datasets:[{

                label:"Votos",

                data:datos.map(p=>p.votos)

            }]


        },


        options:{


            responsive:true,


            plugins:{


                legend:{


                    position:"right"


                }


            }


        }


    });



}
// =============================
// MAPA POR ZONAS
// =============================
function crearMapa(detalleZona){


    if(mapa){

        mapa.remove();

    }



    mapa = L.map("mapaDashboard")
    .setView(
        [-8.067,-79.086],
        12
    );



    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {

            attribution:
            "&copy; OpenStreetMap"

        }

    ).addTo(mapa);




    Object.entries(detalleZona).forEach(([zona,datos])=>{


        let contenido = `


        <strong>${zona}</strong>


        <br>


        Total votos:

        <b>${datos.total}</b>


        <hr>


        `;



        Object.entries(datos.partidos)
        .forEach(([partido,cantidad])=>{


            contenido += `


            ${partido}

            :

            <b>${cantidad}</b>

            votos

            <br>


            `;


        });




        let coordenada =
        zonasMapa.find(
            z=>z.nombre===zona
        );



        if(coordenada){


            L.marker(

                [
                    coordenada.lat,
                    coordenada.lng
                ]

            )

            .addTo(mapa)

            .bindPopup(contenido);


        }



    });


} 

// =============================
// RANKING
// =============================
function crearRanking(partidos){


    const contenedor =
    document.getElementById("rankingCandidatos");


    if(!contenedor){

        console.error("No existe el contenedor rankingCandidatos");
        return;

    }



    const datos = Object.values(partidos);



    datos.sort((a,b)=>b.votos-a.votos);



    let html="";



    datos.forEach((p,index)=>{


        html += `

        <div class="ranking-item">


            <div>

                <strong>
                    #${index+1} ${p.nombre}
                </strong>

                <br>

                <small>
                    ${p.partido}
                </small>

            </div>


            <span>

                ${p.votos} votos

            </span>


        </div>

        `;


    });



    contenedor.innerHTML = html;


}

// =============================
// TABLA ZONA X PARTIDO
// =============================

function crearTablaZona(detalleZona){


    const cabecera =
    document.getElementById("cabeceraZona");


    const cuerpo =
    document.getElementById("bodyZona");



    if(!cabecera || !cuerpo){

        console.error("No existe tabla zona");
        return;

    }



    cabecera.innerHTML = `

        <th>Zona</th>

    `;



    // Obtener partidos únicos

    let partidos = new Set();



    Object.values(detalleZona).forEach(z=>{


        Object.keys(z.partidos)
        .forEach(p=>partidos.add(p));


    });



    partidos=[...partidos];



    // Cabecera dinámica

    partidos.forEach(p=>{


        cabecera.innerHTML += `

        <th>
        ${p}
        </th>

        `;


    });



    cabecera.innerHTML += `

    <th>Total</th>

    `;



    cuerpo.innerHTML="";



    Object.entries(detalleZona)
    .forEach(([zona,datos])=>{


        let fila=`


        <tr>

        <td>
        ${zona}
        </td>

        `;



        let total=0;



        partidos.forEach(p=>{


            let cantidad =
            datos.partidos[p] || 0;



            total += cantidad;



            fila += `

            <td>
            ${cantidad}
            </td>

            `;


        });



        fila += `

        <td>
        <b>${total}</b>
        </td>

        </tr>

        `;



        cuerpo.innerHTML += fila;


    });


}
// =============================
// TABLA DE VOTOS DETALLADA
// =============================

function crearTablaVotos(votos){


    const tablaHtml = $("#tablaVotos");


    if(tablaHtml.length === 0){
        console.error("No existe #tablaVotos");
        return;
    }



    // Crear DataTable solo una vez
    if(!tabla){


        tabla = $('#tablaVotos').DataTable({

            responsive:true,

            pageLength:10,

            order:[[0,"desc"]],

            language:{

                search:"Buscar:",

                lengthMenu:
                "Mostrar _MENU_ registros",

                info:
                "Mostrando _START_ a _END_ de _TOTAL_",

                zeroRecords:
                "No hay registros",

                paginate:{

                    first:"Primero",

                    last:"Último",

                    next:"Siguiente",

                    previous:"Anterior"

                }

            }

        });


    }



    // limpiar sin destruir filtros
    tabla.clear();



    votos.forEach(v=>{


        let candidato="Sin candidato";
        let partido="Sin partido";


        /*
          Supabase puede devolver:

          candidatos:{
             nombre:"",
             partido:""
          }

          o

          candidatos:[
             {
              nombre:"",
              partido:""
             }
          ]

        */


        if(v.candidatos){


            if(Array.isArray(v.candidatos)){


                candidato =
                v.candidatos[0]?.nombre || "Sin candidato";


                partido =
                v.candidatos[0]?.partido || "Sin partido";


            }else{


                candidato =
                v.candidatos.nombre || "Sin candidato";


                partido =
                v.candidatos.partido || "Sin partido";


            }


        }



        tabla.row.add([


            v.id,


            new Date(v.fecha_registro)
            .toLocaleString("es-PE"),


            v.zona || "Sin zona",


            v.dni || "Anónimo",


            candidato,


            partido


        ]);



    });



    tabla.draw(false);


}


// =============================
// EXPORTAR EXCEL
// =============================


document
.getElementById("btnExcel")
.addEventListener("click",()=>{


let tablaHTML =
document
.getElementById("tablaVotos");



let wb =
XLSX.utils.table_to_book(
tablaHTML
);



XLSX.writeFile(
wb,
"votos_elecciones_2026.xlsx"
);



});




// =============================
// EXPORTAR PDF
// =============================


document
.getElementById("btnPDF")
.addEventListener("click",()=>{


const {jsPDF}=window.jspdf;


const doc =
new jsPDF();



doc.text(
"Resultados Elecciones 2026",
14,
15
);



doc.autoTable({

html:"#tablaVotos",

startY:25

});



doc.save(
"votos_elecciones_2026.pdf"
);



});




// =============================
// ACTUALIZAR MANUAL
// =============================


document
.getElementById("btnActualizar")
.addEventListener(
"click",
()=>{


cargarDashboard();


});




// =============================
// CERRAR SESIÓN
// =============================


document
.getElementById("btnSalir")
.addEventListener(
"click",
()=>{


localStorage.removeItem(
"token"
);


localStorage.removeItem(
"nombre"
);



window.location.href=
"index.html";


});




// =============================
// ACTUALIZACION AUTOMATICA
// =============================


// cada 30 segundos


setInterval(()=>{


cargarDashboard();



},30000);



// Primera carga

cargarDashboard();



});