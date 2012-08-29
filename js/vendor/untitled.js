var a = new Array(count);
var v = new DataView(buffer, offset);
for(var i = 0, o = 0; i < count; ++i) {
  (function(o) {
    a[i] = Object.create(Struct.struct_id_1);
    a[i].ident = (function() {
      var str = "";
      for(var j = 0; j < 4; ++j) {
        var char = v.getUint8(o + 0+j, true);
        if (char === 0) { break; }
        str += String.fromCharCode(char);
      }
      return str;
    })();
a[i].version = v.getInt32(o + 4, true);
a[i].lumps = (function(o) {
   var aa = new Array(2);
   for(var j = 0; j < 2; ++j) {
       (function(o) {
a[j] = Object.create(Struct.struct_id_0);
a[j].fileofs = v.getInt32(o + 0, true);
a[j].filelen = v.getInt32(o + 4, true);
})(o);
       o += 8;
   }
   return aa;
})(o + 8);
})(o);
if(callback) { callback(a[i], offset+o); }
o += 24;
}
return a;




var buffer = new ArrayBuffer(24);
var v = new DataView(buffer);
var self = this;(function(o) {
(function() {
   for(var j = 0; j < 4; ++j) {
       v.setUint8(0 + 0+j, self.ident.charCodeAt(j), true);
   }
})()
v.setInt32(0 + 4, self.version, true);
(function(o) {
   for(var j = 0; j < 2; ++j) {
       (function(o) {
v.setInt32(o + 0, self.lumps[j].fileofs, true);
v.setInt32(o + 4, self.lumps[j].filelen, true);
})(o);
       o += 8;
   }
})(0 + 8)
})(0);
return buffer;