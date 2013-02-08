import os, fnmatch

def subdirs(root) :
	dirs = [name for name in os.listdir(root) if os.path.isdir(os.path.join(root, name)) and name[0] != '.']
	dirs.sort()
	return dirs

def rglob(root, pattern, ondisk=True, source=True, strings=False) :
	results = []
	for base, dirnames, filenames in os.walk(root):
		for filename in fnmatch.filter(filenames, pattern):
			results.extend(Glob(os.path.join(base, filename), ondisk, source, strings))
	return results

env = Environment()

SConscript('./build/SConscript.assets', exports=['env', 'subdirs', 'rglob'])
SConscript('./build/SConscript.modules', exports=['env', 'subdirs', 'rglob'])