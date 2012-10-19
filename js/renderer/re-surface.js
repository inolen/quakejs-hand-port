function AddEntitySurfaces() {
	for (var i = 0; i < re.refdef.numRefEntities; i++) {
		var refent = re.refdef.refEntities[i];

		// preshift the value we are going to OR into the drawsurf sort
		//tr.shiftedEntityNum = tr.currentEntityNum << QSORT_ENTITYNUM_SHIFT;

		//
		// the weapon model must be handled special --
		// we don't want the hacked weapon position showing in 
		// mirrors, because the true body position will already be drawn
		//
		/*if ( (ent->e.renderfx & RF_FIRST_PERSON) && tr.viewParms.isPortal) {
			continue;
		}*/

		// simple generated models, like sprites and beams, are not culled
		switch (refent.reType) {
			case RefEntityType.BBOX:
				AddBboxSurfaces(refent);
				break;

			case RefEntityType.MODEL:
				var model = GetModelByHandle(refent.hModel);
				AddMd3Surfaces(refent);
				break;
			default:
				throw new Error('AddEntitySurfaces: Bad reType');
		}
	}
}

function AddBboxSurfaces(refent) {
	var face = re.bboxSurfaces[re.bboxSurfaceNum++ % MAX_BBOX_SURFACES];

	face.shader = FindShader('debugGreenShader');
	face.refent = refent;

	AddDrawSurf(face, face.shader, refent.index);
}

function AddMd3Surfaces(refent) {

}

function TesselateFace(tess, face) {
	var verts = re.world.verts;
	var meshVerts = re.world.meshVerts;
	var offset = tess.numVertexes;

	for (var i = 0; i < face.vertCount; i++) {
		var vert = verts[face.vertex + i];

		tess.xyz[tess.numVertexes*3+0] = vert.pos[0];
		tess.xyz[tess.numVertexes*3+1] = vert.pos[1];
		tess.xyz[tess.numVertexes*3+2] = vert.pos[2];

		tess.texCoords[tess.numVertexes*2+0] = vert.texCoord[0];
		tess.texCoords[tess.numVertexes*2+1] = vert.texCoord[1];

		tess.lmCoords[tess.numVertexes*2+0] = vert.lmCoord[0];
		tess.lmCoords[tess.numVertexes*2+1] = vert.lmCoord[1];

		tess.normals[tess.numVertexes*3+0] = vert.normal[0];
		tess.normals[tess.numVertexes*3+1] = vert.normal[1];
		tess.normals[tess.numVertexes*3+2] = vert.normal[2];

		tess.colors[tess.numVertexes*4+0] = vert.color[0];
		tess.colors[tess.numVertexes*4+1] = vert.color[1];
		tess.colors[tess.numVertexes*4+2] = vert.color[2];
		tess.colors[tess.numVertexes*4+3] = vert.color[3];

		tess.numVertexes++;
	}

	for (var i = 0; i < face.meshVertCount; i++) {
		var meshVert = meshVerts[face.meshVert + i];
		tess.indexes[tess.numIndexes++] = offset + meshVert;
	}
}

// Setup debug vertex/index buffer.
var bboxVerts = [
	// Front face
	-15.0, -15.0,  15.0,
	15.0, -15.0,  15.0,
	15.0,  15.0,  15.0,
	-15.0,  15.0,  15.0,
	// Back face
	-15.0, -15.0, -15.0,
	-15.0,  15.0, -15.0,
	15.0,  15.0, -15.0,
	15.0, -15.0, -15.0,
	// Top face
	-15.0,  15.0, -15.0,
	-15.0,  15.0,  15.0,
	15.0,  15.0,  15.0,
	15.0,  15.0, -15.0,
	// Bottom face
	-15.0, -15.0, -15.0,
	15.0, -15.0, -15.0,
	15.0, -15.0,  15.0,
	-15.0, -15.0,  15.0,
	// Right face
	15.0, -15.0, -15.0,
	15.0,  15.0, -15.0,
	15.0,  15.0,  15.0,
	15.0, -15.0,  15.0,
	// Left face
	-15.0, -15.0, -15.0,
	-15.0, -15.0,  15.0,
	-15.0,  15.0,  15.0,
	-15.0,  15.0, -15.0
];

var bboxIndexes = [
	0,  1,  2,      0,  2,  3,    // front
	4,  5,  6,      4,  6,  7,    // back
	8,  9,  10,     8,  10, 11,   // top
	12, 13, 14,     12, 14, 15,   // bottom
	16, 17, 18,     16, 18, 19,   // right
	20, 21, 22,     20, 22, 23    // left
];

function TesselateBbox(face) {
	var offset = tess.numVertexes;

	for (var i = 0; i < bboxVerts.length; i += 3) {
		tess.xyz[tess.numVertexes*3+0] = bboxVerts[i+0];
		tess.xyz[tess.numVertexes*3+1] = bboxVerts[i+1];
		tess.xyz[tess.numVertexes*3+2] = bboxVerts[i+2];
		tess.numVertexes++;
	}

	for (var i = 0; i < bboxIndexes.length; i++) {
		tess.indexes[tess.numIndexes++] = offset + bboxIndexes[i];
	}
}