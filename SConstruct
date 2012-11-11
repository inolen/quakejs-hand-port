import os, fnmatch

#
# Recursive glob
#
def rglob(root, pattern, ondisk=True, source=True, strings=False):
	results = []
	for base, dirnames, filenames in os.walk(root):
		for filename in fnmatch.filter(filenames, pattern):
			results.extend(Glob(os.path.join(base, filename), ondisk, source, strings))
	return results

#SConscript('SConscript.assets', exports='rglob')
SConscript('SConscript.modules', exports='rglob')