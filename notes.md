# To add a new remote data type

See
`terriajs.lib.Core.getDataType.addOrReplaceRemoteFileUploadType(key: string, newRemoteDataType: RemoteDataType)`

`interface (Remote)DataType { value: string; // logical identifier name: string; // key for translation to get a human readable version description?: string; }`

See

`terriajs/lib/Models/Catalog/addUserFiles` and `.../addUserCatalogMembers.ts`

We may not need to add and register a new type for the ArborMeta data group, since the built in remote 'json' catalog type should do the trick, BUT: in order to override or even call the forceLoad~ methods (meta data and members) we may have to.
The forceLoad~ methods are protected, meaning they can only be called by methods from its own class or subclasses.
We could implement a subclass, then a method that calls the forceLoad methods upon login/logout.

But, we may want to introduce our own subclass of `CatalogGroup`, analogous to i.e. `OpenDataSoftCatalogGroup`, `SocrataCatalogGroup`, etc which is how we connect the key to the class (registering it, then using the custom key when defining 'type' in gcol.json

- [ ] Supply url to ArborMeta group as an url, so it's loaded from the beginning, and does not have to be uploaded as user data
- [ ] Supply nested groups conditional on privileges, based on TerriaGroup records
  - [ ] Implement TerriaGroup model in Django (admin only initially)
  - [ ] Implement API to fetch them individually or as a list based on privileges
  - [ ] Implement API to fetch them as a catalog or group

# SearchProvider

- [ ] Implement and register a SearchProvider subclass that lets us search data in an Arbormeta group intelligently (ie. search the database rather than the downloaded files whereever possible.)

# Auto Login - NOT POSSIBLE

_<mark>Not possible to log in BEFORE the catalog is loaded</mark>, because the React environment does not exist at that stage._

BUT:

- [ ] remove session cookie and csrf cookie on startup. While the cookies are session-cookies and should disabppear when reloading the page, on Chrome they don't always do.

---

- [x] Store username in LocalStorage ~~~(initially for dongled user only)~~~
- [x] Isolate functionality in LoginManager as much as possible (extract from LoginPanel)
- [ ] On startup, confirm whether user wants to login with previous username (yes/no only initially)
- [ ] If yes, fetch user data from server, if successful prompt for authentication and login (using LoginManager)
- [ ] Eventually offer same ability for un-dongled users
  - [ ] Allow user to change username in initial dialog
  - [ ] Allow user to enter password if he does not have a dongle

# Run internally on port 3002 <mark>Done</mark>

Reason:

1.  In my dev environment, when running Django server, it automatically forwards port 3001, seemingly because I have npm installed. That means that when starting the TerriaMap server, it will forward 3001 to a different port, one that is usually not whitelisted by Django for CORS requests, causing requests from TerriaMap to Django to fail. This can be avoided by running it always on the non-standard port of 3002
2.  When published, nginx will publish the https site on the standard port of 3001, makeing it more convenient to have the internal TerriaMap server run on 3002, without the very confusing approach of mapping 3001 to 3002 and vice versa in the nginx and terria map containers respectively
