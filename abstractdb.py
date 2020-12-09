from abstractliftoveriter import AbstractLiftoverIter
import requests
import datetime
from dateutil.parser import parse as parsedate
import os

class AbstractDB(AbstractLiftoverIter):
    def __init__(self, name, directory):
        super().__init__(name, directory)

    def _updateFile(self, url, destination):
        r = requests.head(url)

        shouldUpdate = True
        if os.path.exists(destination):
            url_time = parsedate(r.headers['Last-Modified']).astimezone()
            file_time = datetime.datetime.fromtimestamp(os.path.getmtime(destination)).astimezone()
            if url_time <= file_time: shouldUpdate = False 

        if shouldUpdate:
            print("Downloading " + self.name)
            user_agent = {"User-agent": "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:46.0) Gecko/20100101 Firefox/46.0"}
            r = requests.get(url, headers=user_agent)
            with open(destination, 'wb') as fd:
                for chunk in r.iter_content(4096):
                    fd.write(chunk)