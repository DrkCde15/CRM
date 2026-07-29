import docker
c = docker.from_env()
c.ping()
print("Docker OK")
