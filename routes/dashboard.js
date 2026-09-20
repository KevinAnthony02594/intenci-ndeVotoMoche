const express = require("express");
const router = express.Router();

const supabase = require("../config/supabase");
const verificarToken = require("../middleware/auth");

//-------------------------------------
// Trae TODOS los votos paginando de 1000 en 1000
//-------------------------------------
async function obtenerTodosLosVotos() {

    const TAM = 1000;

    let desde = 0;
    let todos = [];

    while (true) {

        const { data, error } = await supabase

            .from("votos")

            .select(`
                id,
                dni,
                zona,
                fecha_registro,
                candidato_id,
                candidatos (
                    id,
                    nombre,
                    partido,
                    color
                )
            `)

            .order("fecha_registro", { ascending: false })

            .range(desde, desde + TAM - 1);

        if (error) throw error;

        todos = todos.concat(data);

        // si vino menos de 1000, ya no hay más páginas
        if (data.length < TAM) break;

        desde += TAM;
    }

    return todos;
}

router.get("/", verificarToken, async (req, res) => {

    try {

        const data = await obtenerTodosLosVotos();

        //-------------------------------------
        // KPIs
        //-------------------------------------

        const dashboard = {

            total: data.length,

            ganador: null,

            partidos: {},

            zonas: {},

            detalleZona: {},

            votos: data

        };

        //-------------------------------------
        // RECORRER TODOS LOS VOTOS
        //-------------------------------------

        data.forEach(v => {

            if (!v.candidatos) return;

            const nombre =
                `${v.candidatos.nombre} - ${v.candidatos.partido}`;

            //----------------------------------
            // Conteo por candidato
            //----------------------------------

            if (!dashboard.partidos[nombre]) {

                dashboard.partidos[nombre] = {

                    id: v.candidatos.id,

                    nombre: v.candidatos.nombre,

                    partido: v.candidatos.partido,

                    color: v.candidatos.color,

                    votos: 0

                };

            }

            dashboard.partidos[nombre].votos++;

            //----------------------------------
            // Conteo por zona
            //----------------------------------

            if (!dashboard.zonas[v.zona]) {

                dashboard.zonas[v.zona] = 0;

            }

            dashboard.zonas[v.zona]++;

            //----------------------------------
            // Zona × Partido
            //----------------------------------

            if (!dashboard.detalleZona[v.zona]) {

                dashboard.detalleZona[v.zona] = {

                    total: 0,

                    partidos: {}

                };

            }

            dashboard.detalleZona[v.zona].total++;

            if (!dashboard.detalleZona[v.zona].partidos[nombre]) {

                dashboard.detalleZona[v.zona].partidos[nombre] = 0;

            }

            dashboard.detalleZona[v.zona].partidos[nombre]++;

        });

        //-------------------------------------
        // GANADOR
        //-------------------------------------

        dashboard.ganador = Object.values(

            dashboard.partidos

        ).sort(

            (a, b) => b.votos - a.votos

        )[0];

        res.json({

            success: true,

            dashboard

        });

    }

    catch (e) {

        console.log(e);

        res.status(500).json({

            success: false,

            message: e.message

        });

    }

});

module.exports = router;